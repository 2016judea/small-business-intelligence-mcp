#!/usr/bin/env python3
"""Check that a running server registers exactly the tools src/server.ts declares.

WHY. `TOOL_NAMES` in src/server.ts is the one place the count comes from — the
docs page, the landing page and the README all derive from it — but the actual
registration is eleven explicit `register*(server, env)` calls below it, because
registration ORDER is tool precedence and a loop over a map would hide it. So the
list and the calls can drift: add a tool, forget the list, and every page confidently
says ten.

This is that check, run against a live server rather than by reading the source,
which is the only version that can catch a tool that fails to register at runtime.

    python3 scripts/verify_tools.py                        # local wrangler dev
    python3 scripts/verify_tools.py https://<host>/mcp     # a deployed worker

Exits non-zero on any disagreement, so it can gate a deploy.

TWO TRAPS THIS SCRIPT ALREADY HANDLES, both from the build-remote-mcp-server skill:

  1. Streamable HTTP wraps every JSON-RPC response in an SSE frame — the body is
     `event: message\\ndata: {...}`, so a naive `json.loads(resp.read())` raises
     on the first character. The frame is parsed here.
  2. Cloudflare's bot protection answers Python's default `Python-urllib/x.y`
     User-Agent with a plain 403 while the identical curl request gets 200. A
     custom User-Agent is set below; without it this script fails only against
     production, and looks exactly like a broken deploy.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_URL = "http://localhost:8788/mcp"
UA = "sbi-mcp-verify/1.0 (+https://brickandmortar.dev)"


def declared() -> list[str]:
    """TOOL_NAMES, read out of the source rather than imported — this script is
    Python and the constant is TypeScript, and a regex over one array literal is
    cheaper than a build step."""
    src = (ROOT / "src" / "server.ts").read_text()
    block = re.search(r"export const TOOL_NAMES = \[(.*?)\] as const;", src, re.S)
    if not block:
        sys.exit("could not find TOOL_NAMES in src/server.ts")
    return re.findall(r'"([a-z_]+)"', block.group(1))


def registered(url: str) -> list[str]:
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "content-type": "application/json",
            # Both are required by Streamable HTTP; a server may 406 without the
            # event-stream half.
            "accept": "application/json, text/event-stream",
            "user-agent": UA,
        },
    )
    try:
        raw = urllib.request.urlopen(req, timeout=30).read().decode()
    except urllib.error.HTTPError as e:
        sys.exit(f"{url} -> HTTP {e.code}: {e.read().decode()[:300]}")
    except urllib.error.URLError as e:
        sys.exit(f"{url} unreachable: {e.reason}")

    # SSE frame: pull the payload off the first `data:` line, falling back to the
    # whole body for a server that answers with plain JSON.
    for line in raw.splitlines():
        if line.startswith("data:"):
            raw = line[len("data:"):].strip()
            break
    try:
        doc = json.loads(raw)
    except json.JSONDecodeError:
        sys.exit(f"response was not JSON (first 200 chars): {raw[:200]!r}")
    if "error" in doc:
        sys.exit(f"server returned an error: {doc['error']}")
    return [t["name"] for t in doc.get("result", {}).get("tools", [])]


def main() -> int:
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    want, got = declared(), registered(url)
    print(f"{url}\n  declared in server.ts : {len(want)}\n  registered live       : {len(got)}")

    ok = True
    missing = [t for t in want if t not in got]
    extra = [t for t in got if t not in want]
    if missing:
        ok = False
        print(f"  DECLARED BUT NOT REGISTERED: {', '.join(missing)}")
    if extra:
        ok = False
        print(f"  REGISTERED BUT NOT DECLARED: {', '.join(extra)}")
    # ORDER IS PRECEDENCE, so it is checked too — a client lists tools in
    # registration order and a model skims that list. See server.ts.
    if not missing and not extra and want != got:
        ok = False
        print(f"  ORDER DIFFERS\n    declared:   {want}\n    registered: {got}")

    print("  OK" if ok else "  MISMATCH")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
