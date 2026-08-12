# Small Business Intelligence

**by Brick & Mortar** — a free, standalone remote [MCP](https://modelcontextprotocol.io)
server for tearing down small businesses.

It ships analytical **methodology, not data**. Every tool returns a rigorously
structured framework — a research procedure, an output schema, a quality rubric,
caveats — and the calling model executes the research itself, with its own web
search. This server never calls an external API, a database, or any data
provider on your behalf. Your own AI subscription pays for all the inference;
our marginal cost per call is effectively zero.

Live endpoint: **`https://sbi-mcp.small-business-intelligence-mcp.workers.dev/mcp`**
(no auth required — see [Deploy](#deploy) for standing up your own copy).

In production since 2026-08-12: [Brick & Mortar AI](https://brickandmortar.dev)
calls this server as its methodology layer, over the Anthropic Messages API
`mcp_servers` connector (beta `mcp-client-2025-11-20`). It connects to the same
public endpoint above — there is no private build or forked copy.

## The eight tools

| Tool | What it does |
|---|---|
| `business_teardown` | Full structured teardown of one named business — digital presence, review signal, competitive position, pricing posture, visibility gaps, prioritized recommendations. The flagship tool. |
| `competitor_landscape` | Maps the local competitive set for a category + metro: true competitors vs. adjacent players, positioning matrix, saturation signals. |
| `review_intelligence` | Mines public reviews: complaint taxonomy, theme extraction, sentiment trajectory, differentiators customers actually cite, red flags for buyers. |
| `local_visibility_audit` | Local search presence audit: map-pack factors, listing consistency, category selection, site fundamentals — a scored checklist. |
| `pricing_benchmark` | Builds a defensible local pricing comparison, including how to normalize across service bundles and what to do when prices aren't published. |
| `broker_diligence_prep` | Pre-diligence framework for brokers/buyers: SDE framing, multiple ranges (caveated, verify-live), red-flag checklist, seller questions. |
| `market_opportunity_scan` | Gap analysis for a category × metro: underserved demand, oversaturation, whitespace — from public signals only. |
| `compose_report` | Assembles the outputs of prior tool calls into one polished, client-ready report, matched to the audience. |

## Why this architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full write-up. Short version:
[`@modelcontextprotocol/server`](https://www.npmjs.com/package/@modelcontextprotocol/server)
v2 (`McpServer`) + [`agents`](https://www.npmjs.com/package/agents)' stateless
`createMcpHandler`, mounted as a plain Cloudflare Worker `fetch` handler at
`/mcp`. No Durable Objects, no database, no external API calls — genuinely
zero marginal cost per call.

## Local development

```bash
npm install
npm run typecheck    # tsc --noEmit
npm run dev           # wrangler dev — serves http://localhost:8787
```

`wrangler dev` runs against Miniflare's local KV simulation, so the usage
ledger works out of the box with no Cloudflare account needed for local dev.

### Testing with MCP Inspector

With `wrangler dev` running in a separate terminal:

```bash
# list all 8 tools
npx @modelcontextprotocol/inspector --cli --server-url http://localhost:8787/mcp \
  --transport http --method tools/list --format json

# call one
npx @modelcontextprotocol/inspector --cli --server-url http://localhost:8787/mcp \
  --transport http --method tools/call --tool-name business_teardown \
  --tool-args-json '{"business_name":"Example Cafe","city_metro":"Saint Paul, MN"}' \
  --format json
```

Or drop `--cli --format json` for the interactive web UI (`npm run inspector`).
Confirm all 8 tools list with `readOnlyHint: true` and an `outputSchema`, and
that a `tools/call` against each returns `structuredContent` matching it —
verified this way during the build (no `isError`, no protocol-level
rejection, `tools/list` count = 8).

### Manual smoke test (no Inspector needed)

```bash
curl -s -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -H "accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"business_teardown","arguments":{"business_name":"Example Cafe","city_metro":"Saint Paul, MN"}}}'
```

## Deploy

```bash
wrangler login                                   # or set CLOUDFLARE_API_TOKEN
wrangler kv namespace create USAGE_LEDGER          # once — copy the id into wrangler.jsonc
npm run deploy
```

Ships to the free `*.workers.dev` subdomain by default — no DNS work, no
paid plan. A custom domain is a one-line `routes` addition in
`wrangler.jsonc` later.

## Usage stats

Every real tool call increments an aggregate, non-identifying counter
(`stats:{tool_name}:{date}` in the `USAGE_LEDGER` KV namespace — see
`src/middleware/stats.ts`, disclosed in `/privacy` and `/docs`). To see
which tools actually get used:

```bash
export $(grep -v ^# .env | xargs)
python3 scripts/usage_stats.py            # last 30 days
python3 scripts/usage_stats.py --days 7    # last 7 days
```

## Monetization (built, not active)

Every tool passes through a single middleware seam
(`src/middleware/context.ts`). Today, `POLICY_MODE=allow_all` (the shipped
default in `wrangler.jsonc`) never denies a call. Flipping it to `metered`
activates a per-identity daily call limit (`POLICY_METERED_DAILY_LIMIT`),
backed by a Workers KV usage ledger, with clean, plain-language denials
(never a broken-looking protocol error) that include an upgrade link. No
authentication is required at launch; the seam is architected so OAuth 2.1 +
PKCE can be added later without restructuring — see `src/oauth/stub.ts` and
ARCHITECTURE.md's "OAuth: stubbed, not mounted" section.

## Repo structure

```
src/
├── index.ts          # Worker entry — routes / , /docs, /privacy, /mcp
├── server.ts          # createServer(): builds McpServer, registers all 8 tools
├── env.ts              # Env (Worker bindings/vars) type
├── middleware/          # identity resolution, KV usage ledger, policy, withPolicy seam
├── oauth/                # OAuth 2.1 discovery handlers — written, not mounted (see above)
├── tools/                  # one file per tool, all sharing the FrameworkPayload shape in types.ts
└── pages/                    # landing (/), docs (/docs), privacy (/privacy) page HTML
```

## License

MIT — see [LICENSE](./LICENSE).

## Privacy

See [PRIVACY.md](./PRIVACY.md) (or `/privacy` on the live deploy).
