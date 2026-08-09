export function landingPageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Small Business Intelligence by Brick &amp; Mortar</title>
<meta name="description" content="A free remote MCP server that ships analytical methodology for tearing down small businesses — owners, brokers, and analysts point their own AI at it." />
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
  <p class="tagline">by Brick &amp; Mortar — free methodology for tearing down small businesses, run by your own AI.</p>

  <p>
    This is a remote <a href="https://modelcontextprotocol.io">MCP server</a>. It doesn't hold a database
    of businesses and it never calls out to any data provider on your behalf — it ships eight rigorous
    analytical frameworks (research procedures, output schemas, quality rubrics) and your own AI executes
    the research itself, with its own web search, on whatever business you point it at. Free, no account,
    no API key.
  </p>

  <h2>Connect</h2>
  <div class="mono">https://sbi-mcp.small-business-intelligence-mcp.workers.dev/mcp</div>
  <p>No authentication required. Add it as a connector in Claude, or any MCP-compatible client.</p>

  <h2>The eight tools</h2>
  <ul>
    <li><strong>business_teardown</strong> — full structured teardown of one named business</li>
    <li><strong>competitor_landscape</strong> — map the local competitive set for a category + metro</li>
    <li><strong>review_intelligence</strong> — mine public reviews for complaint/compliment themes and red flags</li>
    <li><strong>local_visibility_audit</strong> — scored local-search presence checklist</li>
    <li><strong>pricing_benchmark</strong> — defensible local pricing comparison within a category</li>
    <li><strong>broker_diligence_prep</strong> — pre-diligence framework for brokers and buyers</li>
    <li><strong>market_opportunity_scan</strong> — gap analysis: underserved demand, oversaturation, whitespace</li>
    <li><strong>compose_report</strong> — assemble prior tool outputs into one client-ready report</li>
  </ul>

  <h2>Try it</h2>
  <p>"Run a business_teardown on [a real local business] in [city]."</p>

  <footer>
    <a href="/privacy">Privacy</a> · Built by <a href="https://brickandmortar.dev">Brick &amp; Mortar AI</a>
  </footer>
</body>
</html>`;
}
