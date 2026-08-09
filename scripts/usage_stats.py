#!/usr/bin/env python3
"""Report aggregate, non-identifying per-tool usage stats from Cloudflare KV.

Reads the `stats:{tool_name}:{date}` counters written by
src/middleware/stats.ts (KVToolStats) — never anything identity-shaped,
just call counts per tool per UTC day.

Usage:
    export $(grep -v ^# .env | xargs)
    python3 scripts/usage_stats.py [--days N]

Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in .env.
"""
import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone

KV_NAMESPACE_ID = "8d17fe9122bd4e1090f7b82780c644ae"  # USAGE_LEDGER — see wrangler.jsonc


def api_get(path: str, token: str) -> dict:
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4{path}",
        headers={"Authorization": f"Bearer {token}", "user-agent": "sbi-mcp-usage-stats/1.0"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode())


def list_stats_keys(account_id: str, token: str) -> list[str]:
    keys: list[str] = []
    cursor = None
    while True:
        qs = {"prefix": "stats:", "limit": "1000"}
        if cursor:
            qs["cursor"] = cursor
        path = f"/accounts/{account_id}/storage/kv/namespaces/{KV_NAMESPACE_ID}/keys?{urllib.parse.urlencode(qs)}"
        d = api_get(path, token)
        if not d.get("success"):
            print(f"KV list error: {d.get('errors')}", file=sys.stderr)
            sys.exit(1)
        keys.extend(k["name"] for k in d["result"])
        cursor = d.get("result_info", {}).get("cursor")
        if not cursor:
            break
    return keys


def get_value(account_id: str, token: str, key: str) -> str:
    path = f"/accounts/{account_id}/storage/kv/namespaces/{KV_NAMESPACE_ID}/values/{urllib.parse.quote(key, safe='')}"
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4{path}",
        headers={"Authorization": f"Bearer {token}", "user-agent": "sbi-mcp-usage-stats/1.0"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=30, help="Only show the last N days (default 30)")
    args = parser.parse_args()

    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not account_id or not token:
        print("Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN — export $(grep -v ^# .env | xargs) first.", file=sys.stderr)
        sys.exit(1)

    keys = list_stats_keys(account_id, token)
    if not keys:
        print("No usage recorded yet.")
        return

    cutoff = (datetime.now(timezone.utc) - timedelta(days=args.days)).strftime("%Y-%m-%d")

    per_tool_total: dict[str, int] = defaultdict(int)
    per_tool_per_day: dict[str, dict[str, int]] = defaultdict(dict)

    for key in keys:
        # key shape: stats:{tool_name}:{YYYY-MM-DD}
        _, tool_name, date = key.split(":", 2)
        if date < cutoff:
            continue
        count = int(get_value(account_id, token, key) or 0)
        per_tool_total[tool_name] += count
        per_tool_per_day[tool_name][date] = count

    if not per_tool_total:
        print(f"No usage in the last {args.days} days.")
        return

    print(f"Tool usage, last {args.days} days (UTC)\n")
    print(f"{'tool':30s} {'calls':>8s}")
    print("-" * 40)
    for tool_name, total in sorted(per_tool_total.items(), key=lambda kv: -kv[1]):
        print(f"{tool_name:30s} {total:>8d}")
    print("-" * 40)
    print(f"{'TOTAL':30s} {sum(per_tool_total.values()):>8d}")

    print("\nBy day:")
    for tool_name in sorted(per_tool_total, key=lambda t: -per_tool_total[t]):
        days = per_tool_per_day[tool_name]
        breakdown = ", ".join(f"{d}: {c}" for d, c in sorted(days.items()))
        print(f"  {tool_name}: {breakdown}")


if __name__ == "__main__":
    main()
