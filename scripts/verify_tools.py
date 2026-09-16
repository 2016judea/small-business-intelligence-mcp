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


def registered(url: str) -> list[dict]:
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
    return doc.get("result", {}).get("tools", [])


# The four hints OpenAI grades. A hint that is absent from a live tools/list
# response is NULL to a reviewer, not "defaulted" — which is exactly how the
# 2026-09-15 rejection read: "annotations ... explicitly set to true or false
# (not null) for every tool". `title` is not graded and is not checked here.
HINTS = ("readOnlyHint", "destructiveHint", "idempotentHint", "openWorldHint")
SUBMISSION = ROOT / "chatgpt-app-submission.json"


def annotations_ok(live: list[dict]) -> bool:
    """Every live tool declares all four hints as real booleans, and every one
    matches what chatgpt-app-submission.json promises the reviewer.

    WHY THIS EXISTS. The first submission shipped `idempotentHint` unset on
    eleven of twelve tools and was rejected on 2026-09-15 for exactly that. The
    older name/order check above passed the whole time, because a tool can
    register perfectly and still be annotated wrong. Nothing compared the running
    server to the file OpenAI actually reads until this function.
    """
    promised = json.loads(SUBMISSION.read_text())["tools"]
    ok = True

    for tool in live:
        name = tool["name"]
        ann = tool.get("annotations") or {}
        for hint in HINTS:
            if not isinstance(ann.get(hint), bool):
                ok = False
                print(f"  {name}: {hint} is {ann.get(hint)!r}, not an explicit true/false")

        want = promised.get(name)
        if want is None:
            ok = False
            print(f"  {name}: registered live but absent from chatgpt-app-submission.json")
            continue
        for hint in HINTS:
            if hint in ann and ann[hint] != want["annotations"].get(hint):
                ok = False
                print(
                    f"  {name}: {hint} is {ann[hint]} live but the submission "
                    f"promises {want['annotations'].get(hint)}"
                )
        # A hint with no justification is a rejection waiting to happen: the mail
        # asked for "a clear justification for why the hint is set that way".
        for hint in HINTS:
            key = {
                "readOnlyHint": "read_only_justification",
                "destructiveHint": "destructive_justification",
                "idempotentHint": "idempotent_justification",
                "openWorldHint": "open_world_justification",
            }[hint]
            if not (want.get("justifications", {}).get(key) or "").strip():
                ok = False
                print(f"  {name}: no {key} in chatgpt-app-submission.json")

    for name in promised:
        if name not in {t["name"] for t in live}:
            ok = False
            print(f"  {name}: promised to OpenAI but not registered live")

    return ok


def main() -> int:
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    want, live = declared(), registered(url)
    got = [t["name"] for t in live]
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

    print("  annotations:")
    if not annotations_ok(live):
        ok = False
    else:
        print("    all four hints explicit on every tool, and matching the submission")

    print("  OK" if ok else "  MISMATCH")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
