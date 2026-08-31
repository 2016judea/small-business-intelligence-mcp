"""Does a model REACH for these tools unprompted? Measure it, don't assume it.

WHY THIS EXISTS
  A directory listing gets someone to install the server. The TOOL DESCRIPTION
  decides whether the model actually calls it mid-conversation — and that is the
  only part of this whole distribution effort nobody was checking. A server can
  be listed in every registry on earth and still never fire, because the model
  read the descriptions and did not see itself in them.

  So: hand a model this MCP server and nothing else, ask a question a real person
  would ask, and record what it reached for. The prompts below never name the
  server, the tools, Brick & Mortar, or "public records" as a term of art. If a
  tool only fires when the question quotes its own description back at it, the
  description is doing no work.

WHAT IT ASSERTS
  Each case names the tools that MUST appear. Two controls matter more than the
  positives:
    * `control-general` — an unrelated question must call NOTHING. A toolset that
      fires on chili recipes is a toolset a user disables within a day.
    * `control-wrong-city` — a records question about a city we do not cover must
      route to `data_source_atlas`, NOT to the Twin Cities tools. Getting this
      wrong means every out-of-market user's first experience is a refusal.

  Re-run it after ANY change to a tool name, description or annotation. That is
  the change this catches and nothing else does.

COST
  Eight requests against `claude-opus-5` — roughly a dollar. It is not free, so it
  is a script you run deliberately, not a CI step.

Usage:  python3 scripts/blind_tool_test.py [results.json]
"""
from __future__ import annotations

import json
import os
import pathlib
import sys

import anthropic

MCP_URL = "https://brickandmortar.dev/mcp"
SERVER_NAME = "bricks"
MODEL = "claude-opus-5"

# (id, prompt, tools that must be called, tools that must NOT be called)
CASES: list[tuple[str, str, set[str], set[str]]] = [
    ("record-direct",
     "What did commercial property sell for in Hennepin County last year?",
     {"twin_cities_records"}, set()),
    ("record-oblique",
     "I'm looking at a small retail building in Minneapolis. How do I tell if "
     "the asking price is sane?",
     {"twin_cities_records"}, set()),
    ("market",
     "How many HVAC contractors are there in the Twin Cities, and is that growing?",
     {"twin_cities_records"}, set()),
    ("permit",
     "Has anyone pulled permits on Lake Street in Minneapolis recently?",
     {"twin_cities_records"}, set()),
    ("atlas",
     "Where would I find restaurant health inspection data for Denver?",
     {"data_source_atlas"}, {"twin_cities_records"}),
    ("teardown",
     "Give me a rundown on a coffee shop called Spyhouse in Minneapolis.",
     {"business_teardown"}, set()),
    # THE TWO THAT MATTER — see the module docstring.
    ("control-general",
     "What's a good chili recipe for a cold night?",
     set(), {"twin_cities_records", "twin_cities_datasets", "business_teardown",
             "data_source_atlas"}),
    ("control-wrong-city",
     "What did houses sell for in Boise last year?",
     set(), {"twin_cities_records", "twin_cities_datasets"}),
]


def api_key() -> None:
    """ANTHROPIC_API_KEY, or the bricks .env as a convenience on Aidan's machine."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return
    env = pathlib.Path.home() / "Desktop" / "bricks" / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("ANTHROPIC_API_KEY="):
                os.environ["ANTHROPIC_API_KEY"] = line.split("=", 1)[1].strip().strip('"')
                return
    raise SystemExit("blind_tool_test: set ANTHROPIC_API_KEY.")


def run() -> int:
    api_key()
    client = anthropic.Anthropic()
    rows, failures = [], []

    for cid, prompt, must, must_not in CASES:
        # The MCP connector needs BOTH halves — mcp_servers alone is a 400.
        r = client.beta.messages.create(
            model=MODEL,
            max_tokens=2000,
            betas=["mcp-client-2025-11-20"],
            mcp_servers=[{"type": "url", "url": MCP_URL, "name": SERVER_NAME}],
            tools=[{"type": "mcp_toolset", "mcp_server_name": SERVER_NAME}],
            messages=[{"role": "user", "content": prompt}],
        )
        called = [getattr(b, "name", "?") for b in r.content
                  if "tool_use" in getattr(b, "type", "")]
        cset = set(called)

        missing = must - cset
        forbidden = must_not & cset
        ok = not missing and not forbidden
        if not ok:
            failures.append(
                f"{cid}: missing={sorted(missing) or '—'} "
                f"forbidden={sorted(forbidden) or '—'} called={called or '—'}")

        rows.append({"id": cid, "prompt": prompt, "called": called,
                     "must": sorted(must), "must_not": sorted(must_not),
                     "pass": ok, "stop_reason": r.stop_reason})
        print(f"{'PASS' if ok else 'FAIL'}  {cid:19} {called or '—'}")

    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "blind_test_results.json")
    out.write_text(json.dumps(rows, indent=2) + "\n")
    print(f"\n{len(CASES) - len(failures)}/{len(CASES)} passed → {out}")
    for f in failures:
        print("  " + f)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(run())
