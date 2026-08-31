# Submission checklist — Anthropic Connectors Directory

> **Filing anywhere? Start at [SUBMISSION-KIT.md](SUBMISSION-KIT.md)** — every
> answer a directory has asked us for, in one place: URLs, one-liner, description,
> use cases, connection requirements, reviewer test script, annotations, test
> cases, and the per-platform quirks. This file is the Anthropic history only.

**2026-08-30 — THIS IS NO LONGER THE ONLY DOOR, AND IT IS THE ONLY BLOCKED ONE.**
The server is published in the official MCP Registry as
`io.github.2016judea/small-business-intelligence`, which is what Cursor, VS Code,
Cline and the aggregators read — one publish, a dozen surfaces, no portal. The
Anthropic escalation was re-sent to mcp-review@anthropic.com the same day, three
weeks after the first, asking whether that address is still right.

**ONE THING IS UNFINISHED AND IT NEEDS AIDAN'S GITHUB.** The registry entry is
published but still says `0.1.0` and still points at the workers.dev address.
`server.json` in this repo is already at `0.2.0` with the brickandmortar.dev
endpoint — it just needs a publish, and publishing needs a device login the
session could not do on his behalf:

    cd ~/Desktop/small-business-intelligence-mcp
    mcp-publisher login github     # prints a code; enter it at github.com/login/device
    mcp-publisher publish

The JWT expires fast — well under an hour — so log in and publish in one sitting.
Verify with:

    curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=small-business-intelligence"

Nothing else is blocked on it: brickandmortar.dev/mcp and /connect/ are live and
working. The stale registry row only means a client that finds us through the
registry gets the workers.dev address, which still answers.

Two things changed here that matter to any reviewer:
  * The endpoint is **https://brickandmortar.dev/mcp** now, proxied to this Worker
    by a rewrite in the bricks repo. workers.dev still answers and always will.
  * Every tool states `destructiveHint` explicitly, which ChatGPT's Apps SDK
    requires and we were missing. `/.well-known/openai-apps-challenge` serves
    OpenAI's domain-verification token from a Worker secret.


## Status

**2026-08-31 — SUBMITTED AND IN REVIEW.** Filed successfully after 25 days
blocked. Everything a reviewer needs is in
[SUBMISSION-KIT.md](SUBMISSION-KIT.md), including the no-credentials test script
they asked for: the server is public, unauthenticated and read-only, so there is
no account to provision and a reviewer sees exactly what any user sees.

Do not assert why it went through. The candidates are that Anthropic fixed the
portal, or that something in the 2026-08-30 pass — `destructiveHint` on all 11
tools, the endpoint moving to brickandmortar.dev, the registry publish — changed
the payload enough to pass. Nothing here distinguishes them.


**2026-08-09 — submitted, blocked on an Anthropic-side portal bug.** The
submission form's own validator rejected its own payload:
`submission_data.server_snapshot.tools.0.visibility: Extra inputs are not
permitted`. A raw `tools/list` pull confirms this server never emits a
`visibility` field on any tool, and Anthropic's published review criteria never
mention one either — so this is the portal adding a field its backend rejects,
not something fixable here. Escalated by email to `mcp-review@anthropic.com`
with the exact error and the `tools/list` proof; awaiting a response.
Everything below is complete and ready to resubmit unchanged.

**2026-08-16 — the production consumer is gone, on purpose, and the tool count
is now 9.** Between 2026-08-12 and 2026-08-16 Brick & Mortar AI at
`brickandmortar.dev` called this endpoint as its methodology layer via the
Messages API `mcp_servers` connector, and the site carried a `/mcp/` page. Both
were retired when the server was reframed as an open source gift rather than a
product surface — see "It is a gift, not a product" in ARCHITECTURE.md for the
two reasons.

What changes for review: nothing about transport, safety, schemas or hosting.
What a reviewer should know is that there is now a ninth tool,
`data_source_atlas`, registered first, and that the server's distinguishing
value is the measured public-record access knowledge in `src/tools/sources.ts`
and `src/tools/federal_sources.ts` rather than the frameworks alone. The
"Documentation URL" and "Privacy Policy URL" below are unaffected — both were
always the worker's own routes, never the retired site page.

## Requirements → where satisfied

| Requirement | Where |
|---|---|
| Streamable HTTP transport at `/mcp` | `src/index.ts` — `createMcpHandler` from `agents/mcp/server`, mounted at `/mcp` |
| Every tool has a `title` and correct `annotations` | All 9 tool registrations in `src/tools/*.ts` set `annotations: { title, readOnlyHint: true, openWorldHint: true }` — every tool here only reads/reasons, none mutate anything, so `readOnlyHint: true` is correct across the board |
| Zod-validated input schemas, few-shot description hints | Every tool's `inputSchema` is a `z.object(...)`; every `description` carries 2-3 example invocations a reviewer can try verbatim |
| Clean, actionable error messages (no generic 500s) | Input validation errors are shaped by the SDK itself from the zod schema; usage-policy denials return a normal successful tool result (never `isError`, never an HTTP error) — see `src/middleware/context.ts` |
| Scoped, reasonably sized responses | Each tool's `output_schema` covers only that tool's own responsibility — cross-tool duplication was explicitly avoided during the build (e.g. `competitor_landscape` doesn't re-derive `pricing_benchmark`'s full pricing depth) |
| HTTPS | Cloudflare Workers serve HTTPS by default on both `*.workers.dev` and any custom domain |
| Public privacy policy page | `PRIVACY.md` + the live `/privacy` route (`src/pages/privacy.ts`) |
| Well-formed OAuth Protected Resource Metadata behavior for the no-auth case | Per the MCP 2026-07-28 spec (verified directly against modelcontextprotocol.io before this was built): authorization is OPTIONAL, so a no-auth server is compliant by *not* serving a 401 challenge or a PRM document at all — see ARCHITECTURE.md's "OAuth: stubbed, not mounted" section. `src/oauth/stub.ts` has real, ready handlers for when auth is added later; they are deliberately not mounted today. |
| No authentication required at launch, architected for OAuth 2.1 + PKCE later | `src/middleware/identity.ts` (hashed-IP today, one-line swap to `ctx.http.authInfo` later), `src/oauth/stub.ts` (real AS/PRM metadata builders, unmounted), `src/middleware/policy.ts` (`allow_all` today, `metered` implemented and dormant) |
| TypeScript, official MCP SDK, chosen deliberately | `@modelcontextprotocol/server` v2 + `agents`' stateless `createMcpHandler` — see ARCHITECTURE.md's "SDK / transport decision" for the reasoning, verified against live npm/unpkg data rather than assumed |
| Repo clean enough to open-source | `README.md`, `ARCHITECTURE.md`, `LICENSE` (MIT), `.gitignore` excludes `.dev.vars`/`node_modules`/`.wrangler`; no secrets committed |
| Tested end-to-end with MCP Inspector | See README's "Testing with MCP Inspector" section for the exact command |

## Submission form copy

**Server name:** Small Business Intelligence

**Tagline (55 characters max):** Find the public records behind any small business.

**Documentation URL:** https://sbi-mcp.small-business-intelligence-mcp.workers.dev/docs
— covers connecting, every tool, how the "methodology not data" mechanism
actually works, and a dedicated "For IT & security reviewers" section (data
collection, outbound network access, auth, tool safety, transport/hosting,
vendor info) for admins deciding whether to approve it.

**Privacy Policy URL:** https://sbi-mcp.small-business-intelligence-mcp.workers.dev/privacy

**Use-case description (2-3 sentences):**

> Small Business Intelligence gives Claude a senior analyst's toolkit for evaluating
> any small business, and — more unusually — a map of where the underlying public
> records actually live. `data_source_atlas` turns a plain-English question into a
> research plan naming the specific administrative record that settles it: the
> county's parcel layer, Census County Business Patterns, a state licence roster,
> a BLS series. Nine more cover teardowns, competitive landscapes,
> review mining, visibility audits, pricing benchmarks, broker diligence prep,
> market-gap scans and report assembly. Every tool returns a research procedure
> Claude executes with its own tools, so the analysis is current and grounded in
> real sources rather than a stale cached dataset — and each carries the specific
> ways its sources produce a plausible wrong answer instead of an error.

**Three example prompts a reviewer can try:**

1. "Where would I actually find what [a real address you know] last sold for?" — exercises `data_source_atlas`, including the disclosure/non-disclosure fork that decides whether the answer exists at all.
2. "Run a business_teardown of [a real local coffee shop near you] in [city, state]."
3. "I'm evaluating [a restaurant] as a buyer — run broker_diligence_prep and review_intelligence on it, then compose_report the results for a buyer audience."

**"Use cases" step copy (main tasks + data access + example prompts — the
portal's internal-review-facing field, separate from the public listing
description above):**

> Main tasks: users point their AI at a real small business (or a category +
> metro, for market-level questions) and get back a rigorous research
> framework for one of 9 analysis types: a public-records research plan for a
> question they can only phrase in English (data_source_atlas), full business
> teardown, competitor mapping, review mining, local-search visibility audit,
> pricing benchmarking, broker/buyer diligence prep, market-gap scanning, or
> assembling several of the above into one client-ready report. The AI then
> executes that framework with its own tools and presents the finished
> analysis.
>
> What it needs access to: nothing. No account access, no permissions, no
> data from the user's Claude account, files, or other connected services.
> Every tool call is stateless — it receives only the arguments the user's AI
> passes in directly (a business name, a city/metro, a category) and returns
> a static research framework. It never reads, writes, or stores anything
> about the user or their account.
>
> Example prompts:
> 1. "Where would I actually find what [an address] last sold for, and who owns it?"
> 2. "Run a business_teardown on [a local coffee shop] in [city, state]."
> 3. "Map the competitive landscape for nail salons in [metro] with competitor_landscape."
> 4. "I'm evaluating [a restaurant] as a buyer — run broker_diligence_prep and review_intelligence, then compose_report it for a buyer audience."
> 5. "Scan [category] in [metro] for underserved demand with market_opportunity_scan."

(Bracketed placeholders are intentional — a reviewer should substitute a real
business/category/city they can independently verify the output against,
since this server's whole design is that Claude does live research, not a
canned demo.)

**"Connection requirements" step copy (what accounts/permissions/setup a
user needs before connecting):**

> No accounts, permissions, or setup required. This connector uses no
> authentication — connecting is just adding the server URL. There's nothing
> to sign up for, no API key to generate, and no prerequisite plan or
> subscription on the user's end.

---

## OpenAI Apps/plugin submission — separate path, verify at submission time

OpenAI's app/connector submission is a **different process with its own
requirements**, not a variant of this checklist. Known conceptual
differences to verify directly against OpenAI's current developer docs
before submitting there (this repo's build did not target OpenAI's path,
so none of the below has been implemented or confirmed live):

- **Separate developer/business verification flow** — distinct from
  Anthropic's Connectors Directory review, likely with its own identity or
  domain-ownership verification step.
- **Manifest/metadata format may differ** — confirm whether the current
  format is a legacy `ai-plugin.json`-style manifest or has fully converged
  on MCP-native discovery; this changed over time and should not be assumed
  stable.
- **Branding/icon asset requirements** (exact dimensions, formats) are
  typically platform-specific — don't reuse Anthropic's asset specs
  unchecked.
- **Content and monetization policies may differ**, including how a
  metered/paid tier (this repo's dormant `metered` policy) must be
  disclosed or implemented to satisfy OpenAI's review, if the metered tier
  is ever activated for that surface.
- **Rate-limiting and abuse-prevention expectations** may be assessed
  differently in review — confirm before submitting whether an `allow_all`
  policy (this repo's shipped default) is acceptable there or whether a
  floor is expected.

Treat every bullet above as "go check the current OpenAI docs," not as
settled fact — this section exists so submission isn't attempted on stale
assumptions.
