# Small Business Intelligence

A free, open source [MCP](https://modelcontextprotocol.io) server that teaches
any AI how to research a small business — and, more usefully, **where the public
records actually are**.

**Nine of its tools ship methodology, not data.** Each returns a rigorously
structured framework — a research procedure, an output schema, a quality rubric,
the traps — and the calling model executes the research itself, with its own
tools and its own keys. Those nine call nothing at all.

**Two ship the records.** `twin_cities_datasets` and `twin_cities_records` answer
from joined public records for the seven-county Minneapolis-St. Paul metro —
parcels and lot lines, recorded sale prices, owners, rental licences,
contamination files, business counts by trade, census tracts. Ask about one
address and they answer about that address. They call
[brickandmortar.dev/api/export](https://brickandmortar.dev/api/export), which we
run; no tool here calls any third party. Every answer is a true row count, at
most six example rows, and a link to the complete file — never a file inline.
See [`/privacy`](#privacy) for exactly what those two transmit and what is kept.

That split is deliberate and dated: the server was built on "no remote calls to
our servers" (2026-08-16), which rested on a thesis retired the next day — *the
join is the moat, and the data ships*. Confirmed 2026-08-20; the nine are
untouched.

Live endpoint: **`https://brickandmortar.dev/mcp`**
No auth, no account, no key. Add it as a custom connector and ask.

## Why this exists

A capable model already knows how to reason about a small business. What it
does not know is the operational trivia that lives in nobody's training data:

- that a county's parcel geometry arrives in **survey feet in Kansas and metres
  in Minnesota**, so a hard-coded threshold silently triples;
- that Esri's `Touches` predicate returns **zero touching parcels** rather than
  an error, so adjacency quietly becomes "this parcel touches nothing";
- that **Kansas never records a sale price at all**, so an hour spent looking
  for one is an hour spent looking for something that does not exist;
- that Google's Places API returns **at most five reviews, relevance-ranked**,
  so a sentiment trend computed from them is a real-looking number from a
  sample somebody else chose;
- that County Business Patterns **suppresses small cells**, so reading one as
  zero turns a thin market into an empty one.

Every one of those produces a *plausible wrong answer* rather than a failure.
That is the whole problem with public data, and it is what this server is for.

The frameworks are the reasoning. [`src/tools/sources.ts`](./src/tools/sources.ts)
is the map — where each record lives, how to reach it, and the specific way it
lies. Every access pattern and trap in it was measured live against the agency's
own endpoint while building a real two-metro property and review corpus, not
recalled from training data.

## The tools

Start with `data_source_atlas`. It is the one that changes what the rest are worth.

| Tool | What it does |
|---|---|
| **`data_source_atlas`** | **Given a real question and a place, returns a source-first research plan: which public record settles it, how to reach it, and what the public record cannot answer at all.** Handles the jurisdictional fork (does this state even record sale prices?) before anything else. |
| `business_teardown` | Full structured teardown of one named business — presence, review signal, competitive position, pricing posture, visibility gaps, prioritized evidence-cited recommendations. |
| `competitor_landscape` | Maps the local competitive set: true competitors vs. adjacent players, positioning matrix, saturation signals — corroborated against an administrative establishment count, not just map results. |
| `review_intelligence` | Mines public reviews: complaint taxonomy, theme extraction, sentiment trajectory, red flags for buyers. Rates, never raw counts. |
| `local_visibility_audit` | Local search presence audit: map-pack factors, listing consistency, category selection, site fundamentals — a scored checklist. |
| `pricing_benchmark` | A defensible local pricing comparison, including how to normalize across bundles and what to do when nobody publishes prices. |
| `broker_diligence_prep` | Pre-diligence for brokers and buyers: SDE framing, multiple ranges, red-flag checklist, seller questions — plus the county's own record on the real property. |
| `market_opportunity_scan` | Gap analysis for a category × metro: underserved demand vs. a spot that is empty for a reason. |
| `compose_report` | Assembles prior tool outputs into one client-ready report, matched to the audience. |

## What it will not do

Stated plainly, because the boundary is the design:

- **No remote calls to us.** Every endpoint the tools name is reached by *your*
  model, directly, with your own keys. Nothing routes through this server.
- **No data.** There is no corpus here, nothing cached, nothing to go stale.
- **No account, no telemetry about you.** The only thing recorded is an
  aggregate per-tool call counter with no identity attached. See
  [PRIVACY.md](./PRIVACY.md).
- **No claim to do financial diligence.** Revenue, margin, private lease terms
  and the terms of a private sale are not public anywhere in the United States.
  The tools say so rather than substituting a proxy.

## Connect it

Add the endpoint as a custom connector in Claude, or any MCP-compatible client:

```
https://brickandmortar.dev/mcp
```

Then ask something real:

> "Where would I actually find what 1420 Grand Ave in Saint Paul last sold for?"

> "I want to know if Wichita has room for another dog daycare — what should I pull?"

> "Run a business_teardown on Mucci's Italian in Saint Paul, MN."

## Run your own

```bash
npm install
npm run typecheck    # tsc --noEmit
npm run dev          # wrangler dev — serves http://localhost:8787
```

`wrangler dev` runs against Miniflare's local KV simulation, so the usage ledger
works out of the box with no Cloudflare account needed.

### Verify it

```bash
# list every tool
npx @modelcontextprotocol/inspector --cli --server-url http://localhost:8787/mcp \
  --method tools/list

# call one
npx @modelcontextprotocol/inspector --cli --server-url http://localhost:8787/mcp \
  --method tools/call --tool-name data_source_atlas \
  --tool-arg question="what did this building last sell for" \
  --tool-arg place="Wichita, KS"
```

Or drop `--cli` for the interactive web UI (`npm run inspector`). All tools
should list with `readOnlyHint: true` and an `outputSchema`, and a `tools/call`
against each should return `structuredContent` matching it, with no `isError`.

### Deploy

```bash
wrangler login                              # or set CLOUDFLARE_API_TOKEN
wrangler kv namespace create USAGE_LEDGER   # once — copy the id into wrangler.jsonc
npm run deploy
```

Ships to the free `*.workers.dev` subdomain — no DNS work, no paid plan.

## A note on context cost

`tools/list` is ~43 KB (~10.8K tokens) and sits in the client's context for the
whole session whether or not a tool is ever called. Most of that is the shared
`outputSchema` serialised once per tool. If you fork this and add tools, read the
comment at the top of [`src/tools/types.ts`](./src/tools/types.ts) first — every
`.describe()` in that schema is paid for once per tool, forever.

## Repo structure

```
src/
├── index.ts        # Worker entry — routes /, /docs, /privacy, /mcp
├── server.ts       # createServer(): builds McpServer; TOOL_NAMES is the one list
├── env.ts          # Env (Worker bindings/vars) type
├── middleware/     # identity resolution, KV usage ledger, policy, withPolicy seam
├── oauth/          # OAuth 2.1 discovery handlers — written, not mounted
├── tools/
│   ├── sources.ts          # WHERE THE RECORDS ARE — parcel GIS, Census, state/local, reviews
│   ├── federal_sources.ts  # BLS series construction + six measured traps
│   └── *.ts                # one file per tool, sharing FrameworkPayload from types.ts
└── pages/          # landing (/), docs (/docs), privacy (/privacy)
```

Architecture and the SDK/transport decision: [ARCHITECTURE.md](./ARCHITECTURE.md).

## Contributing

The most valuable contribution is **a measured trap**. If you pull a public
source and it lies to you in a way that returns a plausible number instead of an
error, that belongs in `sources.ts` — with how you measured it and when. Access
patterns rot as agencies reorganise; a correction with a date on it is worth more
than a new framework.

Please don't add anything that makes the server call an external service. The
no-outbound-calls property is what makes it free to run and safe to trust.

## Who made this

Built by [Brick & Mortar](https://brickandmortar.dev) — a small team in Saint
Paul that maintains real local-market corpora (county parcel records, recorded
sales, review panels, federal series) for its own products. The frameworks here
are what we learned building those, including the traps that silently return a
plausible wrong number.

This is a gift, not a funnel. It is not a demo of a paid product, there is
nothing gated, and nothing here reports back to us.

## License

MIT — see [LICENSE](./LICENSE).
