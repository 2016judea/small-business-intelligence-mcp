# Listing kit — every answer a directory has ever asked us for

One file, because we have now filed with four different platforms and each one
asked the same eight questions in a different order. Copy from here; do not
re-compose.

**Figures below were true on 2026-08-31 and they move.** Before filing anything,
re-derive them — the counts come from the live server, and another session
shipping a dataset in the bricks repo changes them without touching this one:

```
cd ~/Desktop/bricks && python3 scripts/fetch_mcp_snapshot.py
```

That prints `N tools, N datasets, N rows` and rewrites
`website/api/_data/mcp_server.json`. It caught the count going 23 → 25 inside a
single day. Then rebuild `/connect/` (`python3 scripts/build_connect.py`) so the
public page and the form say the same thing.

**Current: 11 tools · 25 datasets · 1,575,384 rows.**

---

## 1. Identity and URLs

| Field | Value |
| --- | --- |
| Publisher | Brick and Mortar AI LLC — Minnesota, formed 2026-07-24, EIN 42-4059505 |
| Address | 1651 Eleanor Ave, Saint Paul, MN 55116 |
| Plugin / connector name | Brick & Mortar Public Records — 29 chars; OpenAI caps display_name at 30 |
| Server name (MCP Registry) | `io.github.2016judea/small-business-intelligence` |
| **Endpoint** | `https://brickandmortar.dev/mcp` |
| Transport | Streamable HTTP |
| Authentication | none |
| Website / install docs | https://brickandmortar.dev/connect/ |
| Documentation | https://brickandmortar.dev/connect/docs |
| Privacy policy | https://brickandmortar.dev/connect/privacy |
| Support | https://brickandmortar.dev/contact/ |
| Terms | https://brickandmortar.dev/license/ |
| Source | https://github.com/2016judea/small-business-intelligence-mcp |
| Icon 512×512 | https://brickandmortar.dev/brand/icon.png |
| Icon 256×256 | https://brickandmortar.dev/brand/icon-256.png |
| Wordmark 900×240 | https://brickandmortar.dev/brand/logo.png |
| **Composer icon** 64×64 SVG | https://brickandmortar.dev/brand/icon-composer.svg |
| Composer icon, raster | `/brand/icon-composer-64.png` · `-512.png` · `-64-white.png` |
| App icon as SVG, colour | https://brickandmortar.dev/favicon.svg — same 64×64 mark as `icon.png` |
| Social card 1200×630 | https://brickandmortar.dev/brand/mark-og.png |
| Availability | United States |

**The colour icon cannot serve ChatGPT's composer.** OpenAI's own submission
guidelines say nothing about icon dimensions at all, and its UI guidelines say only
*"use either system icons or custom iconography that fits within ChatGPT's visual
world — monochromatic and outlined"*
(developers.openai.com/plugins/concepts/ui-guidelines). The 64×64 SVG figure is
**not** from OpenAI — it comes from a third-party build guide
(xmcp.dev/blog/build-and-submit-gpt-apps: *"An SVG icon 64x64 pixels in size. Test
it in dark mode as many icons become invisible on dark backgrounds"*). Treat the
dimension as a convention, the monochrome-and-outlined rule as the actual
requirement, and re-check the form at filing time.

`icon-composer.svg` is stroke-only on `currentColor`, so it takes ChatGPT's own
foreground in both themes — a baked `#111827` is exactly the icon that disappears
on a dark composer. Same running-bond mark as `icon.png`, cut to three courses
because five is mud below 20px; QA'd at 16/18/20/24/32/64 on `#fff` and `#212121`.
The PNGs are transparent-background fallbacks in case the portal refuses an SVG
upload; `-64-white.png` exists only for a surface that takes a raster and paints
it on dark. Built 2026-08-31.

**Every policy URL is on brickandmortar.dev on purpose.** `/connect/privacy` and
`/connect/docs` are Vercel rewrites to the Worker's own pages, added 2026-08-30
because reviewers check that a listing's policy URLs belong to the publisher — a
privacy policy on `workers.dev` submitted by an LLC reads as a mismatch. The
workers.dev originals still resolve; do not quote them on a form.

## 2. One-liner

> Public property, permit and licence records for Minneapolis–St. Paul, joined and queryable.

91 characters. **The MCP Registry hard-caps `description` at 100 and returns 422
above it** — the first publish failed on a 249-character version.

Alternates, same cap: *"1.5M rows of Minneapolis–St. Paul public records:
parcels, sales, permits, licences. Free."* (90) · *"The Twin Cities' public
records, joined into one queryable model. Free, read-only, no account."* (94)

## 3. Description

> Ask about a building in the Twin Cities and get an answer from the record
> instead of a guess. Eleven read-only tools: two read 25 joined datasets of
> Minneapolis–St. Paul public records — 1,573,968 rows of parcels, recorded
> sales, assessor values, business licences, building permits, inspections,
> emergency calls, contamination sites, flood zones and wages. The other nine are
> research frameworks that work in any US metro: tear down one business, map a
> competitive set, benchmark local pricing, or find which public record answers a
> question in a city we don't hold.
>
> Free, no account, no key, nothing to sign in to. The underlying files are
> CC BY 4.0 and downloadable at brickandmortar.dev/datasets.

## 4. Primary use cases

> **Answer a property question from the record, not from memory.** Ask what a
> building in Minneapolis or St. Paul last sold for, what the assessor values it
> at, what permits have been pulled on it, or which licences are active at an
> address — the model reads the county and city records instead of guessing.
>
> **Size a local market before committing money to it.** Business counts by trade
> across five vintages, wages, building stock by era, and recorded sale prices
> per square foot, so an owner, broker or lender can test an assumption against
> what the metro actually did.
>
> **Screen a site for what a lender or buyer will ask about.** Contamination
> sites, flood zones, inspections and emergency-call volume around a parcel — the
> questions that surface late in diligence, answered before an offer.
>
> **Find the right public record in a city we don't hold.** Given a question and
> a place anywhere in the US, the atlas names the administrative record that
> answers it and how to get at it, rather than sending the model to a search
> engine.
>
> **Tear down a single business or a competitive set.** Nine research frameworks
> — presence, review signal, pricing normalisation, market gaps — that the
> calling model executes with its own tools, in any American metro.

## 5. Connection requirements

> **None.** No account, no API key, no OAuth, nothing to sign in to, and no cost.
> Add the URL and it works.
>
> Transport is Streamable HTTP at `https://brickandmortar.dev/mcp`. Every one of
> the 11 tools is read-only — the server writes nothing, sends nothing, and has
> no user state to affect, so there is nothing for a reviewer to authenticate as
> and no demo credentials to supply.
>
> There is no rate limit today. The server does no per-call work beyond reading
> published files, so it costs nothing to serve; a metering path exists in the
> code but is switched off and would only ever be a cap, never a paywall.
>
> Data coverage is the seven-county Minneapolis–St. Paul metro. The nine
> framework tools work in any US metro; the two record tools do not.

*(That last paragraph belongs in this field, not only in the description. Stating
the coverage limit inside the connection requirements is what stops a reviewer
from testing "Denver", getting a refusal, and marking the server broken.)*

## 6. Test setup / reviewer access

Anthropic's ask, verbatim: *"write these instructions so they contain every link,
credential, and step needed to autonomously access the MCP server."* Ours:

> **No test account is required. There are no credentials of any kind.**
>
> The server is public, unauthenticated and read-only. There is no sign-up, no
> API key, no OAuth flow, no tenant, and no user state — a reviewer, human or
> automated, gets the same fully populated responses we do. Nothing needs to be
> provisioned before review.
>
> Endpoint: `https://brickandmortar.dev/mcp` · Transport: Streamable HTTP ·
> Auth: none, send no `Authorization` header
> Install docs: https://brickandmortar.dev/connect/
> Source: https://github.com/2016judea/small-business-intelligence-mcp
> Registry: `io.github.2016judea/small-business-intelligence`
>
> Reproduce the whole surface from a terminal, with no setup:
>
> ```
> # 1. List the tools — expect 11
> curl -s https://brickandmortar.dev/mcp \
>   -H "Content-Type: application/json" \
>   -H "Accept: application/json, text/event-stream" \
>   -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
>
> # 2. The data catalogue — expect 25 datasets with real row counts
> curl -s https://brickandmortar.dev/mcp \
>   -H "Content-Type: application/json" \
>   -H "Accept: application/json, text/event-stream" \
>   -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"twin_cities_datasets","arguments":{}}}'
>
> # 3. Query one dataset — expect a row count and column list
> curl -s https://brickandmortar.dev/mcp \
>   -H "Content-Type: application/json" \
>   -H "Accept: application/json, text/event-stream" \
>   -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"twin_cities_records","arguments":{"dataset":"sales"}}}'
>
> # 4. A framework tool, any US metro — expect a research plan, no data
> curl -s https://brickandmortar.dev/mcp \
>   -H "Content-Type: application/json" \
>   -H "Accept: application/json, text/event-stream" \
>   -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"data_source_atlas","arguments":{"question":"Where do I find restaurant health inspections?","place":"Denver, CO"}}}'
> ```
>
> Responses arrive as a Streamable HTTP SSE frame (`event: message` /
> `data: {...}`), so send the `Accept` header shown above. The edge also requires
> a browser-style `User-Agent`; a bare `Python-urllib` UA is refused with a 403
> before the server sees the request.
>
> Two things a reviewer should know, so correct behaviour is not read as a fault:
>
> 1. **Row counts move.** These are live public records — the counties and cities
>    publish on their own cadence. Any non-zero count is correct; the numbers
>    above were true on 2026-08-31.
> 2. **Record coverage is the seven-county Minneapolis–St. Paul metro only, by
>    design.** The two record tools will not answer for other cities and correctly
>    say so. The other nine work anywhere in the US — step 4 uses Denver
>    deliberately to show the difference.
>
> Support: https://brickandmortar.dev/contact/ · Privacy:
> https://brickandmortar.dev/connect/privacy

## 7. Tool annotations, and the justification every platform asks for

All 11 tools: `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: true`.

> Every tool is read-only: nine return a research framework as text and change
> nothing anywhere; two read published public-records files over HTTPS. Nothing in
> this server writes, posts, sends, purchases or deletes, and there is no account
> to affect — hence `destructiveHint: false` throughout. `openWorldHint` is true
> because the two data tools fetch from an external endpoint
> (brickandmortar.dev) rather than from the conversation.

**`destructiveHint` was missing until 2026-08-30** and OpenAI's own guidelines
name missing annotations as a common rejection cause. If a tool is ever added,
set all three or the next submission fails.

## 8. Test cases

Five positive, each run against the live endpoint rather than imagined:

| # | Prompt | Expected |
| --- | --- | --- |
| 1 | "What Twin Cities datasets do you have?" | `twin_cities_datasets` returns 25 datasets with real row counts. |
| 2 | "What's in the Twin Cities sales data?" | `twin_cities_records` with `dataset: "sales"` returns a row count (34,302 on 2026-08-31) and the column list. |
| 3 | "Tear down Kramarczuk's Sausage Company in Minneapolis." | `business_teardown` returns the four-quadrant framework — Presence, Perception, Position, Performance. |
| 4 | "Where do I find restaurant health inspections in Denver?" | `data_source_atlas` returns a source-first research plan naming the administrative record. |
| 5 | "Benchmark HVAC pricing in Minneapolis." | `pricing_benchmark` returns a normalisation framework for comparing local prices. |

Three negative:

| # | Prompt | Expected |
| --- | --- | --- |
| 1 | "Delete the parcel record for 123 Main St." | No such tool. The model reports the server is read-only rather than attempting anything. |
| 2 | "What did 1600 Pennsylvania Ave sell for?" | Records cover the Minneapolis–St. Paul metro only. Frameworks still answer; no file does. |
| 3 | "Give me the owner's phone number and email for a parcel." | Not in the data. Tax-billing name and address come from the county's public record; no personal contact details are held or returned. |

## 9. Starter prompts

* "What public records exist for a property in Minneapolis?"
* "What did commercial property sell for in Hennepin County last year?"
* "Which public dataset answers whether a neighbourhood is gaining businesses?"

## 10. Per-platform notes

### Official MCP Registry — LISTED
`io.github.2016judea/small-business-intelligence`, latest **0.2.0** pointing at
brickandmortar.dev/mcp. Publish with `mcp-publisher publish` from this repo after
`mcp-publisher login github` (device code, entered at github.com/login/device).
**The JWT expires in well under an hour — log in and publish in one sitting.**
Description caps at 100 chars. Verify with:

```
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=small-business-intelligence"
```

DNS auth is the alternative — the brickandmortar.dev zone is writable over the
Vercel API, which would make publishing unattended and rename the entry
`dev.brickandmortar/…`. Not done: it creates a second row rather than renaming
the first.

### Anthropic Connectors Directory — SUBMITTED, IN REVIEW (2026-08-31)
Unblocked and filed. It had been stuck since 2026-08-06 on the portal's own
validator rejecting its own payload —
`submission_data.server_snapshot.tools.0.visibility: Extra inputs are not permitted`,
a field this server has never emitted — escalated by email 08-06 and again 08-30.
Whether the portal was fixed or something in the 08-30 pass cleared it is not
known; do not claim a cause. See SUBMISSION.md for the full history.

### ChatGPT app directory — UNBLOCKED 2026-08-31, READY TO FILE
1. Apps Management = Write at platform.openai.com/settings/organization/people/roles
   (org owners already have it).
2. **Business verification — DONE 2026-08-31**, under Brick and Mortar AI LLC. It
   must be *business*, not individual, and the submission has to come from the same
   org that holds the verification.
3. platform.openai.com/plugins → Create plugin → **With MCP** → URL type
   **Universal** → the endpoint above → auth **none** → CSP **none** (no UI).
4. Scan Tools finds 11. Domain verification issues a token; then
   `wrangler secret put OPENAI_APPS_CHALLENGE` in this repo. It is served at
   `https://brickandmortar.dev/.well-known/openai-apps-challenge` as text/plain —
   **fetched from the ROOT of the host, not beside the MCP path**, which is the
   documented way submissions fail. Unset, the route 404s on purpose: an empty 200
   fails verification while looking fine. Check with
   `curl https://brickandmortar.dev/.well-known/openai-apps-challenge`. The route
   must return that **one** plugin's token as bare text — OpenAI rejects a JSON
   array or several tokens at one URL.
5. The form then wants: name, short + long description, logo, category, website /
   support / privacy / terms URLs (§1), five positive and three negative test
   cases (§8), starter prompts (§9), release notes, and availability. All of it is
   above. No CSP and no demo credentials — there is no UI and no account.
6. Approval does not publish it. Publishing is a second, separate click in the
   portal, and the listing lands in the one directory ChatGPT and Codex share.
   OpenAI publishes no review SLA.

### Glama — AUTOMATIC
A superset of the official registry. Nothing to file.

### mcp.so — one GitHub issue at chatmcp/mcpso
Draft lives in the bricks repo at `drafts/mcp-so-listing-2026-08-30.md`.

### Editors
No filing needed — Cursor and VS Code install from a URL scheme, and
`/connect/` carries both one-click links plus Claude Code, Codex and generic JSON.
The links are generated in `scripts/build_connect.py` from the snapshot, because a
stale endpoint inside a base64 blob is unreadable by eye and unfindable by grep.
