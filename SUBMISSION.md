# Submission checklist — Anthropic Connectors Directory

## Status

**2026-08-09 — submitted, blocked on an Anthropic-side portal bug.** The
submission form's own validator rejected its own payload:
`submission_data.server_snapshot.tools.0.visibility: Extra inputs are not
permitted`. A raw `tools/list` pull confirms this server never emits a
`visibility` field on any tool, and Anthropic's published review criteria never
mention one either — so this is the portal adding a field its backend rejects,
not something fixable here. Escalated by email to `mcp-review@anthropic.com`
with the exact error and the `tools/list` proof; awaiting a response.
Everything below is complete and ready to resubmit unchanged.

**2026-08-12 — the server now has a production consumer.** Brick & Mortar AI at
`brickandmortar.dev` calls this endpoint as its methodology layer via the
Messages API `mcp_servers` connector. Relevant to review only as evidence the
server is live and exercised in the open; no submission answer below changes.

## Requirements → where satisfied

| Requirement | Where |
|---|---|
| Streamable HTTP transport at `/mcp` | `src/index.ts` — `createMcpHandler` from `agents/mcp/server`, mounted at `/mcp` |
| Every tool has a `title` and correct `annotations` | All 8 tool registrations in `src/tools/*.ts` set `annotations: { title, readOnlyHint: true, openWorldHint: true }` — every tool here only reads/reasons, none mutate anything, so `readOnlyHint: true` is correct across the board |
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

**Tagline (55 characters max):** Free frameworks for tearing down any small business.

**Documentation URL:** https://sbi-mcp.small-business-intelligence-mcp.workers.dev/docs
— covers connecting, all 8 tools, how the "methodology not data" mechanism
actually works, and a dedicated "For IT & security reviewers" section (data
collection, outbound network access, auth, tool safety, transport/hosting,
vendor info) for admins deciding whether to approve it.

**Privacy Policy URL:** https://sbi-mcp.small-business-intelligence-mcp.workers.dev/privacy

**Use-case description (2-3 sentences):**

> Small Business Intelligence gives Claude a senior analyst's toolkit for evaluating
> any small business — teardowns, competitive landscapes, review mining, local
> visibility audits, pricing benchmarks, broker diligence prep, market-gap scans,
> and report assembly. Every tool returns a rigorous research procedure that Claude
> executes with its own web search, so the analysis is always current and grounded
> in real sources rather than a stale cached dataset. Built for owners auditing
> their own presence, brokers and buyers doing pre-diligence, and analysts sizing
> up a local market.

**Three example prompts a reviewer can try:**

1. "Run a business_teardown of [a real local coffee shop near you] in [city, state]."
2. "I'm evaluating [a restaurant] as a buyer — run broker_diligence_prep and review_intelligence on it, then compose_report the results for a buyer audience."
3. "Scan the nail salon market in [a mid-size city] for whitespace with market_opportunity_scan."

**"Use cases" step copy (main tasks + data access + example prompts — the
portal's internal-review-facing field, separate from the public listing
description above):**

> Main tasks: users point their AI at a real small business (or a category +
> metro, for market-level questions) and get back a rigorous research
> framework for one of 8 analysis types: full business teardown, competitor
> mapping, review mining, local-search visibility audit, pricing
> benchmarking, broker/buyer diligence prep, market-gap scanning, or
> assembling several of the above into one client-ready report. The AI then
> executes that framework with its own web search and presents the finished
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
> 1. "Run a business_teardown on [a local coffee shop] in [city, state]."
> 2. "Map the competitive landscape for nail salons in [metro] with competitor_landscape."
> 3. "I'm evaluating [a restaurant] as a buyer — run broker_diligence_prep and review_intelligence, then compose_report it for a buyer audience."
> 4. "Scan [category] in [metro] for underserved demand with market_opportunity_scan."

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
