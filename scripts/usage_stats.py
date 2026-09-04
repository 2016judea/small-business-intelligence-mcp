#!/usr/bin/env python3
"""Report aggregate, non-identifying per-tool usage stats from Cloudflare KV.

Reads the `stats:{tool_name}:{date}:{client}` counters written by
src/middleware/stats.ts (KVToolStats) — never anything identity-shaped,
just call counts per tool per UTC day per CLIENT CLASS (claude / openai /
crawler / cli / …, see src/middleware/client_class.ts). Keys written before
2026-09-04 have no class segment and are read as "unknown".

`--who` adds the request-level view from Cloudflare Workers Logs (kept a few
days): every /mcp request by day and client class, and each tools/call that
did NOT come from a crawler, with its coarse origin. That is the view that
answers "has a person used this?" — the KV counters alone cannot.

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
    parser.add_argument("--who", action="store_true", help="Also read Cloudflare Workers Logs: requests by client class, and non-crawler tool calls")
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
    per_tool_per_day: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    per_class_total: dict[str, int] = defaultdict(int)
    per_class_per_day: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for key in keys:
        # key shape: stats:{tool_name}:{YYYY-MM-DD}[:{client}] — 3 parts before 2026-09-04
        parts = key.split(":")
        tool_name, date = parts[1], parts[2]
        client = parts[3] if len(parts) > 3 else "unknown"
        if date < cutoff:
            continue
        count = int(get_value(account_id, token, key) or 0)
        per_tool_total[tool_name] += count
        per_tool_per_day[tool_name][date] += count
        per_class_total[client] += count
        per_class_per_day[client][date] += count

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

    print("\nBy client class (keys before 2026-09-04 are all 'unknown'):")
    for client in sorted(per_class_total, key=lambda c: -per_class_total[c]):
        days = per_class_per_day[client]
        breakdown = ", ".join(f"{d}: {c}" for d, c in sorted(days.items()))
        print(f"  {client:8s} {per_class_total[client]:>5d}   {breakdown}")

    if args.who:
        who(account_id, token, min(args.days, 7))


# ── Workers Logs: the request-level view ─────────────────────────────────────
#
# Two event types per /mcp request, joined on requestId:
#   cf-worker-event  Cloudflare's own record: User-Agent, coarse geo (cf.city,
#                    cf.country, cf.asOrganization). Exists for every request.
#   cf-worker        our console.log line from src/index.ts logRpc():
#                    {ev:"rpc", method, tool, client, via}. Exists from the
#                    2026-09-04 deploy on; older requests have only the UA.
# Retention is a few days, so this can never replace the KV counters — it
# answers a different question: WHO, not how many.
#
# Read the class off the User-Agent here too (same buckets as client_class.ts)
# so days before the log line existed still classify.

import re

_CRAWLER = re.compile(r"bot|probe|monitor|research|census|crawl|collector|audit|scan|watch|observ|harvest|liveness|opt-out|pricing|spike|grader|scraper|verify|registry|checker|archive|study|sync|spider|index|\+https?:|@", re.I)
_CLI = re.compile(r"^(node|undici|curl|python-httpx|python-requests|python-urllib|Go-http-client|Deno|Bun|aiohttp|Ruby|GuzzleHttp|lua-resty|Python|Java|okhttp|axios|got)", re.I)


def classify(ua: str) -> str:
    ua = (ua or "").strip()
    if not ua: return "unknown"
    if re.match(r"^Claude-User", ua, re.I): return "claude"
    if re.search(r"openai-mcp|ChatGPT", ua, re.I): return "openai"
    if re.search(r"gemini", ua, re.I): return "gemini"
    if re.search(r"cursor", ua, re.I): return "cursor"
    if _CRAWLER.search(ua): return "crawler"
    if re.match(r"^Mozilla/", ua, re.I): return "browser"
    if _CLI.match(ua): return "cli"
    return "unknown"


def _telemetry(account_id: str, token: str, frm_ms: int, to_ms: int, extra_filters: list) -> list:
    body = {
        "queryId": "usage_stats", "timeframe": {"from": frm_ms, "to": to_ms},
        "parameters": {"datasets": ["cloudflare-workers"],
                        "filters": [{"key": "$metadata.service", "operation": "eq", "value": "sbi-mcp", "type": "string"}] + extra_filters,
                        "calculations": [], "groupBys": []},
        "view": "events", "limit": 2000,  # the API's hard cap; one UTC day fits under it at today's volume
    }
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/observability/telemetry/query",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "user-agent": "sbi-mcp-usage-stats/1.0"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode()).get("result", {}).get("events", {}).get("events", [])


def who(account_id: str, token: str, days: int) -> None:
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    print(f"\nRequests by day and client class (Workers Logs, last {days} days; * = tools/call):")
    people = []
    for i in range(days - 1, -1, -1):
        a = today - timedelta(days=i); b = a + timedelta(days=1)
        frm, to = int(a.timestamp() * 1000), int(b.timestamp() * 1000)
        reqs = _telemetry(account_id, token, frm, to, [{"key": "$metadata.type", "operation": "eq", "value": "cf-worker-event", "type": "string"}])
        logs = _telemetry(account_id, token, frm, to, [{"key": "$metadata.type", "operation": "eq", "value": "cf-worker", "type": "string"}])
        rpc = {e["$metadata"].get("requestId"): e.get("source", {}) for e in logs if isinstance(e.get("source"), dict) and e["source"].get("ev") == "rpc"}
        by_class: dict[str, int] = defaultdict(int)
        calls_by_class: dict[str, int] = defaultdict(int)
        for e in reqs:
            r = e["$workers"]["event"].get("request", {}); h = r.get("headers", {}) or {}; cf = r.get("cf", {}) or {}
            cls = classify(h.get("user-agent", ""))
            by_class[cls] += 1
            line = rpc.get(e["$metadata"].get("requestId"), {})
            if line.get("method") == "tools/call":
                calls_by_class[cls] += 1
                if cls != "crawler":
                    ts = datetime.fromtimestamp(e["timestamp"] / 1000, timezone.utc).strftime("%m-%d %H:%M")
                    people.append((ts, cls, line.get("tool"), line.get("via"), cf.get("city"), cf.get("country"), cf.get("asOrganization"), h.get("user-agent", "")[:40]))
        cells = ", ".join(f"{c}: {by_class[c]}" + (f" (*{calls_by_class[c]})" if calls_by_class[c] else "") for c in sorted(by_class, key=lambda c: -by_class[c]))
        print(f"  {a.strftime('%m-%d')}  {len(reqs):>5d} req   {cells}")
    print("\nTool calls NOT from a crawler (the 'did a person use it' list; needs the 2026-09-04 log line, so nothing before that date):")
    if not people:
        print("  none")
    for row in people:
        ts, cls, tool, via, city, country, org, ua = row
        print(f"  {ts}  {cls:8s} {tool or '?':26s} via {via or '?':46s} {city or '?'}, {country or '?'}  [{org or '?'}]  {ua}")


if __name__ == "__main__":
    main()
