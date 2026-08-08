# Architecture

## What this is

A free, standalone remote MCP server. It ships **methodology, not data**: every
tool returns a structured analytical framework (research procedure, output
schema, quality rubric, caveats) and the calling model executes the research
itself with its own web search. Marginal cost per call to us is ~zero — no
outbound API calls from the server, ever.

Working brand: **Small Business Intelligence by Brick & Mortar**. Standalone
product, not a funnel into the report business — different tech stack
(TypeScript/Workers vs. the `bricks` repo's Python pipeline), different repo,
deliberately not nested inside `bricks`.

## SDK / transport decision

**`@modelcontextprotocol/server` v2** (the new split TS SDK, `McpServer` class)
+ **`agents`** package's stateless `createMcpHandler` (aliased from
`createStatelessMcpHandler`, exported at `agents/mcp/server`), mounted as a
plain Cloudflare Worker `fetch` handler at `/mcp`. No Durable Objects.

This was verified directly against the npm registry and unpkg-hosted compiled
type declarations on 2026-08-08 (not assumed from training data, which
predates this release):

- `@modelcontextprotocol/sdk` v1 (the old monolithic package) is superseded —
  latest is 1.30.0, published 2026-07-27, and its own README now points to v2.
- `@modelcontextprotocol/server` v2.0.0 (Anthropic, PBC) implements the
  **2026-07-28 MCP spec**. `McpServer` is a confirmed export.
- `agents` v0.20.1 (Cloudflare) exports `agents/mcp/server` with
  `createMcpHandler` = `createStatelessMcpHandler` — a genuinely stateless
  handler, confirmed via the package's compiled `.d.ts`. `McpAgent` (the old
  Durable-Object-backed class) still exists in `agents/mcp` for stateful use
  cases (multiplayer, persistent conversation memory) but is not what this
  product needs — every tool call here is independent and read-only.

**Why this beats the alternatives:**

- A hand-rolled Streamable HTTP transport on the raw `Server` class would
  duplicate what `createMcpHandler` already does correctly for Workers
  (request/response framing, session id handling, error shaping).
- `McpAgent` (Durable Objects) buys us nothing — no session state to persist —
  and adds an infra dependency to reason about for zero benefit. Durable
  Objects with SQLite storage *are* free-tier eligible as of 2026 (100k
  requests/day, no card required), so this isn't a cost-avoidance call, it's a
  complexity-avoidance one: the stateless path is simpler, and simpler is more
  correct here.
- Every tool handler is a pure function of its input — there's no reason to
  pay for statefulness we don't use.

## Directory structure

```
small-business-intelligence-mcp/
├── README.md
├── PRIVACY.md
├── SUBMISSION.md
├── ARCHITECTURE.md            (this file)
├── LICENSE                    (MIT — matches the MCP SDK's own license)
├── package.json / tsconfig.json / wrangler.jsonc
├── .dev.vars.example
├── src/
│   ├── index.ts                # Worker fetch handler: routes / , /privacy, /mcp
│   ├── server.ts                # createServer(): builds McpServer, registers all 8 tools
│   ├── middleware/
│   │   ├── context.ts            # withPolicy() wrapper — the single seam every tool passes through
│   │   ├── identity.ts           # resolveIdentity(): hashed-IP today, OAuth subject later
│   │   ├── ledger.ts              # UsageLedger interface + KVUsageLedger impl
│   │   └── policy.ts              # allow_all (active) / metered (dormant) policy decision
│   ├── oauth/
│   │   └── stub.ts                # AS metadata + PRM handlers — written, NOT mounted (see below)
│   ├── tools/
│   │   ├── types.ts               # shared FrameworkPayload shape + zod helpers all 8 tools use
│   │   ├── business_teardown.ts
│   │   ├── competitor_landscape.ts
│   │   ├── review_intelligence.ts
│   │   ├── local_visibility_audit.ts
│   │   ├── pricing_benchmark.ts
│   │   ├── broker_diligence_prep.ts
│   │   ├── market_opportunity_scan.ts
│   │   └── compose_report.ts
│   └── pages/
│       ├── landing.ts             # HTML for /
│       └── privacy.ts             # HTML for /privacy
```

## Monetization seam (built now, dormant until activated)

Every tool handler is wrapped by a single function, `withPolicy()`, in
`src/middleware/context.ts`. Nothing tool-specific lives in the middleware,
and nothing auth-specific lives in the tools — this is the seam hard
constraint #… (anti-patterns list) calls out explicitly.

1. **Identity** (`identity.ts`) — today: `sha256(CF-Connecting-IP + daily
   salt)`, giving an anonymous-but-rate-limitable identity that rotates
   daily (so we never accumulate a long-lived fingerprint of an IP). Later:
   swap the resolver to read `getMcpAuthContext(request)` — a real export
   already present in `agents/mcp/server` for exactly this — no changes
   needed anywhere else.
2. **Ledger** (`ledger.ts`) — `UsageLedger` interface (`increment`,
   `getCount`) with one implementation today, `KVUsageLedger`, keyed
   `usage:{identity}:{yyyy-mm-dd}`, 48h TTL (auto-expiring, so the free KV
   tier never fills up). Swappable for Durable Objects/D1 later without
   touching call sites.
3. **Policy** (`policy.ts`) — `POLICY_MODE` env var. `allow_all` (the
   shipped default) always allows. `metered` (implemented, not activated)
   allows N calls/identity/day, then returns a denial.
4. **Denials are clean tool results, not protocol errors.** A metered
   denial returns a normal, successful MCP tool result whose content is a
   short structured message plus an `upgrade_url` — never `isError: true`,
   never an HTTP-level 4xx. The calling model reads it like any other tool
   output and relays it to the user in plain language instead of surfacing
   a broken-looking error.

## OAuth: stubbed, not mounted

Per the MCP 2026-07-28 spec (verified directly against
modelcontextprotocol.io before writing this): **authorization is OPTIONAL**.
A server that doesn't require auth is spec-compliant by *not* doing any of
the OAuth dance — no 401 challenge on `/mcp`, no `WWW-Authenticate` header,
no Protected Resource Metadata document. Serving a PRM document for a
resource that isn't actually protected would be the non-compliant move (RFC
9728 describes *protected* resources).

So `src/oauth/stub.ts` contains real, ready handlers for Authorization Server
Metadata and Protected Resource Metadata — written against the same request
context the tools use — but they are **not registered** in `src/index.ts`'s
router. Turning on auth later is: (a) uncomment the two route registrations,
(b) point `identity.ts` at `getMcpAuthContext` instead of the IP hash, (c)
flip `POLICY_MODE`. No restructuring.

## Tool file convention

Every file in `src/tools/` exports one zod-validated MCP tool. Each tool's
handler returns the same top-level shape (defined once in `types.ts`):

```ts
{
  framework: string;            // the analytical model/lens for this tool
  research_procedure: Step[];   // ordered, concrete, opinionated — never "search and summarize"
  output_schema: object;        // exact structure of the finished deliverable
  quality_rubric: {
    good_looks_like: string[];
    common_failure_modes: string[];
  };
  caveats: string[];
}
```

`business_teardown` is built first as the flagship — it sets the depth bar
(rubric written like a senior analyst who's done 200 of these) that the
other seven match.

Every `registerTool()` call sets `title` (human-facing name) and
`annotations: { readOnlyHint: true, openWorldHint: true }` (all eight tools
only read/reason, none mutate anything) alongside the zod `inputSchema`, and
each description carries 2-3 few-shot invocation examples — that's what
Connectors Directory discovery and Claude's own tool-selection reasoning
both key off.

## Deploy

Default target: the free `*.workers.dev` subdomain — zero DNS work, ships
today. `wrangler.jsonc` names the worker `sbi-mcp`, so the live endpoint
will be `https://sbi-mcp.<account-subdomain>.workers.dev/mcp`. A custom
domain (e.g. `mcp.brickandmortar.dev`) is a one-line `routes` addition
later, but brickandmortar.dev's DNS currently lives on Vercel, so pointing a
subdomain at this Worker needs a Cloudflare-side custom hostname or a DNS
change on the Vercel side first — deliberately deferred out of this build so
launch isn't blocked on it.

**Deploy needs Cloudflare auth that doesn't exist on this machine yet** (`wrangler
whoami` → not authenticated, no `CLOUDFLARE_API_TOKEN` in env). Everything
through `wrangler dev` (local testing, MCP Inspector) doesn't need it. The
actual `wrangler deploy` step is the one place this build will stop and ask
Aidan to either run `wrangler login` or hand me a `CLOUDFLARE_API_TOKEN`.
