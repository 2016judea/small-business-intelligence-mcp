#!/usr/bin/env python3
"""Build the ChatGPT plugin ZIP that platform.openai.com/plugins now takes.

OpenAI moved app submissions to a package upload on 2026-10 (SUBMISSION-KIT §10,
2026-10-09). The package is: root plugin.json (Agent Plugins schema, OpenAI
fields under extensions.com.openai), mcp.json, skills/, assets/.

Nothing about the tools is typed here. The groups below must partition
TOOL_NAMES in src/server.ts exactly, and the listing's counts are derived from
them, because the 9/25 listing said "a twelfth tool ... the only tool that is
not read-only" for a month after the server grew to sixteen tools.

Test cases come from chatgpt-app-submission.json, the same file
scripts/verify_tools.py holds the live annotations against.

    python3 scripts/build_chatgpt_plugin.py   ->  chatgpt-plugin.zip
"""
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PKG = ROOT / "chatgpt-plugin"
OUT = ROOT / "chatgpt-plugin.zip"
VERSION = "1.1.1"
NAME = "app-6a95e9522b4081919c5c13be9d36f908"  # the dashboard's package name; keep it

RECORDS = ["what_we_have_for_you", "twin_cities_lookup", "twin_cities_datasets",
           "twin_cities_records", "bring_your_document"]
FRAMEWORKS = ["data_source_atlas", "business_teardown", "competitor_landscape",
              "review_intelligence", "local_visibility_audit", "pricing_benchmark",
              "broker_diligence_prep", "market_opportunity_scan", "compose_report"]
SENDS = ["request_a_feature", "start_an_engagement"]

WORDS = {2: "Two", 5: "Five", 9: "Nine", 16: "Sixteen"}


def tool_names():
    src = (ROOT / "src/server.ts").read_text()
    block = re.search(r"TOOL_NAMES = \[(.*?)\]", src, re.S).group(1)
    return re.findall(r'"([a-z_]+)"', block)


def main():
    names = tool_names()
    groups = RECORDS + FRAMEWORKS + SENDS
    if sorted(names) != sorted(groups) or len(groups) != len(set(groups)):
        sys.exit(f"tool groups do not partition TOOL_NAMES: {sorted(set(names) ^ set(groups))}")
    sub = json.loads((ROOT / "chatgpt-app-submission.json").read_text())
    for t in SENDS:
        if sub["tools"][t]["annotations"]["readOnlyHint"] is not False:
            sys.exit(f"{t} is listed as sending but annotated read-only")
    for t in RECORDS + FRAMEWORKS:
        if sub["tools"][t]["annotations"]["readOnlyHint"] is not True:
            sys.exit(f"{t} is listed as read-only but annotated otherwise")

    n = WORDS[len(names)]
    desc = (
        "Brick & Mortar answers questions about small businesses and commercial property from "
        f"public records rather than general knowledge. It has {n.lower()} tools. "
        f"{WORDS[len(RECORDS)]} read joined public-records datasets for the seven-county "
        "Minneapolis-St. Paul metro — parcels and lot lines, recorded sale prices, tax-billing "
        "owners, rental licences, contamination files, business counts by trade, census tracts. "
        "They show what is on file for a person's role, answer one address, return true row "
        "counts, sample rows and a link to the complete file, and read a document the person "
        "brings against those records without storing it. "
        f"{WORDS[len(FRAMEWORKS)]} more work in any US metro and return a research procedure "
        "instead of an answer: which administrative record actually settles a question, how to "
        "reach it, and what the public record cannot answer at all. Typical workflows are "
        "tearing down one named business before buying or advising it, mapping a local "
        "competitive set, prepping broker diligence, benchmarking prices, auditing local search "
        "visibility, mining public reviews for patterns, and assembling the results into one "
        "client-ready report. "
        f"{WORDS[len(SENDS)]} tools send something, and only when the person asks: one sends a "
        "feature, data or correction request to the publisher, and one files an enquiry asking "
        "a person at Brick & Mortar to read the record for them; that person replies by email. "
        "Those two are the only tools that are not read-only. No account is needed."
    )

    def case(c, positive):
        out = {"description": c["description"], "prompt": c["user_prompt"]}
        if positive:
            out["tools_triggered"] = c["tools_triggered"]
            out["expected_behavior"] = c["expected_output"]
        return out

    manifest = {
        "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
        "name": NAME,
        "version": VERSION,
        "description": desc,
        "author": {"name": "Brick and Mortar AI LLC", "url": "https://brickandmortar.dev/"},
        "homepage": "https://brickandmortar.dev/connect/",
        "repository": "https://github.com/2016judea/small-business-intelligence-mcp",
        "license": "MIT",
        "keywords": ["public records", "small business", "commercial property", "Minneapolis"],
        "extensions": {"com.openai": {
            "interface": {
                "displayName": sub["app_info"]["display_name"],
                "shortDescription": sub["app_info"]["subtitle"],
                "longDescription": desc,
                "developerName": "Brick and Mortar AI LLC",
                "category": "Business & Operations",
                "capabilities": [],
                "websiteURL": "https://brickandmortar.dev/",
                "supportURL": "https://brickandmortar.dev/contact",
                "privacyPolicyURL": "https://brickandmortar.dev/connect/privacy",
                "termsOfServiceURL": "https://brickandmortar.dev/license/",
                "defaultPrompt": [
                    "What Twin Cities property records can you pull?",
                    "What commercial property sold near 2900 Hennepin Ave, Minneapolis?",
                    "Where do I find restaurant health inspections in Denver?",
                ],
                "logo": "./assets/logo.png",
                "composerIcon": "./assets/composer-icon.png",
                "composerIconDark": "./assets/composer-icon-dark.png",
            },
            "review": {
                "test_cases": {
                    "positive": [case(c, True) for c in sub["test_cases"]],
                    "negative": [case(c, False) for c in sub["negative_test_cases"]],
                },
                "demo_recording_url": "https://brickandmortar.dev/demo/chatgpt-app-review.mp4",
                "commerce": False,
                "commerce_description": "No purchase or payment happens in ChatGPT. One tool "
                    "files an enquiry with a person at Brick & Mortar, who replies by email.",
            },
            "publication": {
                "countries": ["US"],
                "release_notes": (
                    f"{VERSION}: moves the listing to the plugin package format. The description "
                    f"now covers all {len(names)} tools the server serves; four tools added since "
                    "the last scan (what_we_have_for_you, twin_cities_lookup, bring_your_document, "
                    "start_an_engagement) carry explicit true/false annotations like every other "
                    "tool. Skills updated to match."
                ),
            },
        }},
    }
    if len(manifest["extensions"]["com.openai"]["interface"]["displayName"]) > 30:
        sys.exit("displayName over 30")
    if len(manifest["extensions"]["com.openai"]["interface"]["shortDescription"]) > 30:
        sys.exit("shortDescription over 30")
    (PKG / "plugin.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    (PKG / "mcp.json").write_text(json.dumps({
        "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        "mcpServers": {"brick-and-mortar": {"type": "streamable-http",
                                            "url": "https://brickandmortar.dev/mcp"}},
    }, indent=2) + "\n")

    OUT.unlink(missing_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for f in ["plugin.json", "mcp.json"] + [f"assets/{p.name}" for p in sorted((PKG / "assets").iterdir())]:
            z.write(PKG / f, f)
        for p in sorted((ROOT / "skills").rglob("*")):
            if p.is_file():
                z.write(p, str(p.relative_to(ROOT)))
    print(f"{OUT.name}: {len(names)} tools ({len(RECORDS)} records, {len(FRAMEWORKS)} frameworks, "
          f"{len(SENDS)} send), v{VERSION}")
    for i in zipfile.ZipFile(OUT).infolist():
        print(f"  {i.file_size:>7}  {i.filename}")


if __name__ == "__main__":
    main()
