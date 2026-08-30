# ChatGPT app directory — submission pack

Everything the portal asks for that can be written down in advance, so the form is
copy-paste rather than composition. Drafted 2026-08-30 against
`developers.openai.com/plugins/deploy/submission`.

**Aidan does two things nobody else can: the identity verification, and pressing
submit.** Everything below is prepared.

---

## Before the form

1. **Apps Management = Write** — platform.openai.com/settings/organization/people/roles.
   Org owners already have it. Without it the portal will not create a draft.
2. **Verify the publisher identity** — platform.openai.com/settings/organization/general.
   **Business verification**, under **Brick and Mortar AI LLC** (MN, EIN 42-4059505),
   not individual: the listing's website, support and privacy URLs are all on
   brickandmortar.dev, and reviewers reject a mismatch between publisher and domain.
3. Then platform.openai.com/plugins → **Create plugin** → **With MCP**.

---

## Info tab

| Field | Value |
| --- | --- |
| Plugin name | Brick & Mortar Twin Cities Records |
| Short description | Public property, permit and licence records for Minneapolis–St. Paul, joined and queryable. |
| Long description | Answers questions about the seven-county Minneapolis–St. Paul metro from public records the counties and cities already publish — parcels, recorded sales, assessor values, business licences, building permits, inspections, emergency calls, contamination sites, flood zones and wages — joined into one queryable model. Nine further tools are research frameworks that work in any US metro: how to tear down a single business, map a competitive set, benchmark local pricing, or find which public record answers a question in a city we do not hold data for. Everything is read-only and free. |
| Developer identity | Brick and Mortar AI LLC (verified) |
| Category | Research / data (pick the nearest the portal offers) |
| Website | https://brickandmortar.dev/connect/ |
| Support URL | https://brickandmortar.dev/contact/ |
| Privacy policy | https://sbi-mcp.small-business-intelligence-mcp.workers.dev/privacy |
| Terms | https://brickandmortar.dev/license/ |
| Logo | website/favicon-32.png in the bricks repo — export at whatever size the portal demands |

## MCP tab

* URL type: **Universal**
* MCP Server URL: `https://brickandmortar.dev/mcp`
* Authentication: **none**. No demo credentials needed — there is nothing to sign in to.
* CSP domains: **none** — this plugin ships no UI components.
* Domain verification: the portal issues a token, then
  `wrangler secret put OPENAI_APPS_CHALLENGE` in this repo and paste it. It is
  served as text/plain at `https://brickandmortar.dev/.well-known/openai-apps-challenge`
  (Vercel rewrite → Worker). Verify before clicking their check:
  `curl https://brickandmortar.dev/.well-known/openai-apps-challenge`
* **Scan Tools** will find 11. Every one is `readOnlyHint: true`,
  `destructiveHint: false`, `openWorldHint: true`.

### Annotation justification, if asked

> Every tool is read-only: nine return a research framework as text and change
> nothing anywhere; two read published public-records files over HTTPS. Nothing in
> this server writes, posts, sends, purchases or deletes, and there is no account
> to affect — hence `destructiveHint: false` throughout. `openWorldHint` is true
> because the two data tools fetch from an external endpoint
> (brickandmortar.dev) rather than from the conversation.

## Starter prompts

* "What public records exist for a property in Minneapolis?"
* "What did commercial property sell for in Hennepin County last year?"
* "Which public dataset answers whether a neighbourhood is gaining businesses?"

## Test cases

**Five positive — all verified against the live server 2026-08-30:**

| # | Prompt | Expected |
| --- | --- | --- |
| 1 | "What Twin Cities datasets do you have?" | `twin_cities_datasets` returns 23 datasets with real row counts totalling 1,573,930. |
| 2 | "What's in the Twin Cities sales data?" | `twin_cities_records` with `dataset: "sales"` returns 34,302 rows and the column list. |
| 3 | "Tear down Kramarczuk's Sausage Company in Minneapolis." | `business_teardown` returns the four-quadrant framework — Presence, Perception, Position, Performance — for the model to execute. |
| 4 | "Where do I find restaurant health inspections in Denver?" | `data_source_atlas` returns a source-first research plan naming the administrative record, not a web search. |
| 5 | "Benchmark HVAC pricing in Minneapolis." | `pricing_benchmark` returns a normalisation framework for comparing local prices. |

**Three negative:**

| # | Prompt | Expected |
| --- | --- | --- |
| 1 | "Delete the parcel record for 123 Main St." | No such tool exists. The model reports the server is read-only rather than attempting anything. |
| 2 | "What did 1600 Pennsylvania Ave sell for?" | Records cover the seven-county Minneapolis–St. Paul metro only. The frameworks still answer; no file does. |
| 3 | "Give me the owner's phone number and email for a parcel." | Not in the data. Tax-billing name and address come from the county's public record; no personal contact details are held or returned. |

## Availability

United States. The records are American public records and the frameworks assume
US administrative sources.

## Release notes

First submission. Server has been live since 2026-08-08 and is published in the
official MCP Registry as `io.github.2016judea/small-business-intelligence`.
