import { TOOL_COUNT } from "../server.js";
export function landingPageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Small Business Intelligence by Brick &amp; Mortar</title>
<meta name="description" content="A free, open source MCP server that knows where the public records are — county parcel layers, Census counts, BLS series, licence rosters — and the specific ways each one lies. Nine research frameworks, no account, no data held." />
<link rel="icon" href="https://brickandmortar.dev/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="https://brickandmortar.dev/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="apple-touch-icon" href="https://brickandmortar.dev/apple-touch-icon.png" />
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    max-width: 720px;
    margin: 0 auto;
    padding: 4rem 1.5rem 6rem;
    line-height: 1.6;
    color: #1a1a1a;
    background: #fff;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #e8e8e8; background: #111; }
    a { color: #7db8ff; }
    code, .mono { background: #1d1d1d; }
  }
  h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  .tagline { color: #666; font-size: 1.05rem; margin-top: 0; }
  @media (prefers-color-scheme: dark) { .tagline { color: #999; } }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: #f4f4f4;
    padding: 0.9rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    overflow-x: auto;
  }
  h2 { font-size: 1.15rem; margin-top: 2.5rem; }
  ul { padding-left: 1.25rem; }
  li { margin-bottom: 0.4rem; }
  footer { margin-top: 4rem; font-size: 0.85rem; color: #888; }
  a { color: #0a5cd4; }
</style>
</head>
<body>
  <h1>Small Business Intelligence</h1>
  <p class="tagline">A free, open source MCP server that knows where the public records are.</p>

  <p>
    A capable AI already knows how to reason about a small business. What it doesn't know is that
    Kansas never records a sale price, that Google's API hands back five relevance-ranked reviews and
    calls it a corpus, or that a county's parcel data arrives in feet on one side of a state line and
    metres on the other. Each of those returns a <em>plausible wrong answer</em> rather than an error.
  </p>
  <p>
    This <a href="https://modelcontextprotocol.io">MCP server</a> ships nine rigorous research
    frameworks and, more usefully, the map: which public record actually settles a question, how to
    reach it, and the specific way it lies. It holds no database and never calls any data provider on
    your behalf — your own AI does the digging, with its own keys. Free, no account, nothing reports back.
  </p>

  <h2>Connect</h2>
  <div class="mono">https://sbi-mcp.small-business-intelligence-mcp.workers.dev/mcp</div>
  <p>No authentication required. Add it as a connector in Claude, or any MCP-compatible client.</p>

  <h2>Try it</h2>
  <p class="mono">"Where would I actually find what [an address you know] last sold for?"</p>

  <h2>The ${TOOL_COUNT} tools</h2>
  <ul>
    <li><strong>data_source_atlas</strong> — a plain question becomes a research plan naming the record that settles it, and what no record can</li>
    <li><strong>business_teardown</strong> — full structured teardown of one named business</li>
    <li><strong>competitor_landscape</strong> — map the local competitive set for a category + metro</li>
    <li><strong>review_intelligence</strong> — mine public reviews for complaint/compliment themes and red flags</li>
    <li><strong>local_visibility_audit</strong> — scored local-search presence checklist</li>
    <li><strong>pricing_benchmark</strong> — defensible local pricing comparison within a category</li>
    <li><strong>broker_diligence_prep</strong> — pre-diligence framework for brokers and buyers</li>
    <li><strong>market_opportunity_scan</strong> — gap analysis: underserved demand, oversaturation, whitespace</li>
    <li><strong>compose_report</strong> — assemble prior tool outputs into one client-ready report</li>
    <li><strong>twin_cities_datasets</strong> — what joined public records we hold for the seven-county Minneapolis&ndash;St. Paul metro</li>
    <li><strong>twin_cities_records</strong> — ask those records about one property or the whole market</li>
    <li><strong>request_a_feature</strong> — tell us what this should do and does not; it reaches a person</li>
  </ul>

  <h2>Why it's free</h2>
  <p>
    We maintain real local-market corpora — county parcel records, recorded sales, review panels,
    federal series — for our own products. The frameworks here are what we learned building those,
    including the traps that silently return a plausible wrong number. For the Twin Cities we go
    further and hand over the records themselves, free and without an account, because the join is
    the moat and the data is not. Nothing is gated, nothing is upsold, and the only thing kept is a
    daily-rotated hash used to count calls — see <a href="/privacy">privacy</a>.
  </p>

  <footer>
    <a href="/docs">Documentation</a> · <a href="/privacy">Privacy</a> ·
    <a href="https://github.com/2016judea/small-business-intelligence-mcp">Source (MIT)</a> ·
    Built by <a href="https://brickandmortar.dev">Brick &amp; Mortar</a>
  </footer>
</body>
</html>`;
}
