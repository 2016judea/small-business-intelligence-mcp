export function docsPageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Documentation — Small Business Intelligence</title>
<meta name="description" content="How to connect Small Business Intelligence, what its 8 tools do, and what IT/security reviewers need to know before approving it." />
<link rel="icon" href="https://brickandmortar.dev/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="https://brickandmortar.dev/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="apple-touch-icon" href="https://brickandmortar.dev/apple-touch-icon.png" />
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    max-width: 760px;
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
    table { border-color: #333 !important; }
    th, td { border-color: #333 !important; }
    .callout { background: #17202b !important; border-color: #2a3b4d !important; }
  }
  h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  .tagline { color: #666; font-size: 1.05rem; margin-top: 0; }
  @media (prefers-color-scheme: dark) { .tagline { color: #999; } }
  h2 { font-size: 1.2rem; margin-top: 2.75rem; }
  h3 { font-size: 1rem; margin-top: 1.75rem; }
  .mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: #f4f4f4;
    padding: 0.9rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    overflow-x: auto;
  }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: #f4f4f4; padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.9em; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.92rem; }
  th, td { text-align: left; padding: 0.55rem 0.7rem; border-bottom: 1px solid #e2e2e2; vertical-align: top; }
  th { font-weight: 600; color: #555; }
  @media (prefers-color-scheme: dark) { th { color: #aaa; } }
  ul, ol { padding-left: 1.25rem; }
  li { margin-bottom: 0.4rem; }
  .callout {
    background: #f4f8fc;
    border: 1px solid #dbe7f3;
    border-radius: 10px;
    padding: 1rem 1.25rem;
    margin: 1.25rem 0;
  }
  .toc { font-size: 0.92rem; }
  .toc li { margin-bottom: 0.25rem; }
  footer { margin-top: 4rem; font-size: 0.85rem; color: #888; }
  a { color: #0a5cd4; }
  .badge { display: inline-block; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em; padding: 0.15rem 0.5rem; border-radius: 999px; background: #eef7f0; color: #1a7a3d; }
  @media (prefers-color-scheme: dark) { .badge { background: #12301c; color: #6cd48a; } }
</style>
</head>
<body>
  <h1>Documentation</h1>
  <p class="tagline">Small Business Intelligence by Brick &amp; Mortar — how it works, what it can do, and what to check before approving it.</p>

  <nav class="toc">
    <ul>
      <li><a href="#connect">Connect</a></li>
      <li><a href="#tools">The 8 tools</a></li>
      <li><a href="#how-it-works">How it actually works</a></li>
      <li><a href="#for-reviewers">For IT &amp; security reviewers</a></li>
      <li><a href="#support">Support</a></li>
    </ul>
  </nav>

  <h2 id="connect">Connect</h2>
  <div class="mono">https://sbi-mcp.small-business-intelligence-mcp.workers.dev/mcp</div>
  <p>
    <span class="badge">No authentication required</span> — add it as a custom connector in Claude
    (or any <a href="https://modelcontextprotocol.io">MCP</a>-compatible client) using the URL above.
    Nothing to sign in to, no API key to generate.
  </p>
  <p>Try it once connected:</p>
  <div class="mono">"Run a business_teardown on [a real local business you know] in [city, state]."</div>

  <h2 id="tools">The 8 tools</h2>
  <p>
    Each tool covers a distinct piece of small-business analysis. They're designed to be used
    individually or chained — run a few, then hand the results to <code>compose_report</code> to
    assemble one polished write-up.
  </p>
  <table>
    <thead><tr><th>Tool</th><th>What it does</th></tr></thead>
    <tbody>
      <tr><td><code>business_teardown</code></td><td>Full structured teardown of one named business — presence, review signal, competitive position, pricing, visibility gaps, prioritized recommendations. Start here for a single-business question.</td></tr>
      <tr><td><code>competitor_landscape</code></td><td>Maps the true competitive set for a category + metro — who's a real competitor vs. an adjacent player, positioning, saturation.</td></tr>
      <tr><td><code>review_intelligence</code></td><td>Mines public reviews for complaint/compliment themes, sentiment trajectory over time, and buyer-relevant red flags.</td></tr>
      <tr><td><code>local_visibility_audit</code></td><td>Scored local-search presence checklist — map-pack factors, listing consistency, category selection, site fundamentals.</td></tr>
      <tr><td><code>pricing_benchmark</code></td><td>Defensible local pricing comparison within a category, including how to normalize non-identical service bundles.</td></tr>
      <tr><td><code>broker_diligence_prep</code></td><td>Pre-diligence framework for brokers/buyers — SDE framing, current-multiple research method, red-flag checklist, seller questions.</td></tr>
      <tr><td><code>market_opportunity_scan</code></td><td>Gap analysis for a category × metro — underserved demand, oversaturation, and genuine whitespace vs. structurally-empty ground.</td></tr>
      <tr><td><code>compose_report</code></td><td>Assembles the outputs of prior tool calls into one client-ready report, tone- and structure-matched to the audience (owner, broker, buyer, investor).</td></tr>
    </tbody>
  </table>

  <h2 id="how-it-works">How it actually works</h2>
  <p>
    This server ships <strong>analytical methodology, not data</strong>. Every tool call returns a
    structured research framework — a named analytical lens, an ordered set of concrete research
    steps, the exact shape the finished deliverable should take, a quality rubric, and honest
    caveats. Your AI assistant reads that framework and then does the actual work itself: it runs
    its own web search, follows the procedure, and writes the deliverable.
  </p>
  <div class="callout">
    <strong>The server itself never calls Google, Yelp, or any other data provider.</strong>
    It has no database of businesses and makes no outbound API calls at all. The research
    happens entirely inside your AI's own session, using whatever web-search capability your AI
    already has.
  </div>
  <p>
    Practically: ask your AI to research a business, it calls one of these tools, the tool hands
    back the framework for that kind of analysis, and your AI executes it live. That's also why
    the analysis is always current — there's no cached dataset to go stale.
  </p>

  <h2 id="for-reviewers">For IT &amp; security reviewers</h2>

  <h3>Data collection</h3>
  <p>
    We log a <strong>one-way hashed</strong> representation of the caller's IP address, rotated
    every UTC day, paired with a per-day call count. That's it for anything identity-shaped — no
    request bodies, no tool arguments, no business names or search queries, no conversation
    content. Full detail in the <a href="/privacy">privacy policy</a>. This exists only to support
    a metered free-usage tier that is <strong>not currently active</strong> — every call is allowed
    today, unlimited.
  </p>
  <p>
    Separately, we keep an aggregate, non-identifying count of calls per tool per day (e.g.
    "business_teardown: 340 calls on 2026-08-09"), used only to understand which tools are useful.
    It has no connection to the hashed-IP counter and carries no identity of any kind.
  </p>

  <h3>Outbound network access</h3>
  <p>
    None. The server makes zero calls to external APIs, databases, or third-party services. All
    research a tool call triggers happens in the calling AI's own session, not on our
    infrastructure.
  </p>

  <h3>Authentication</h3>
  <p>
    None required. Per the <a href="https://modelcontextprotocol.io">MCP specification</a>,
    authorization is optional — a server that doesn't require it is compliant by not implementing
    the OAuth flow at all, rather than serving misleading auth challenges. The codebase is
    architected so OAuth 2.1 + PKCE can be added later without restructuring, if a future paid
    tier needs it.
  </p>

  <h3>Tool safety</h3>
  <p>
    All 8 tools are marked <code>readOnlyHint: true</code> in their MCP tool annotations and are
    read-only in practice — none of them write, delete, or modify anything anywhere. A tool call
    cannot take any action outside of returning a JSON framework object; every actual write action
    (sending a search query, browsing the web) is performed by the calling AI using its own tools,
    not by this server.
  </p>

  <h3>Transport &amp; hosting</h3>
  <p>
    Streamable HTTP over HTTPS, served from Cloudflare Workers. Origin and Host headers are
    validated on every request to the <code>/mcp</code> endpoint to guard against DNS-rebinding-
    style attacks.
  </p>

  <h3>Vendor</h3>
  <p>
    Built and operated by Brick &amp; Mortar AI (<a href="https://brickandmortar.dev">brickandmortar.dev</a>),
    Saint Paul, MN. This MCP server is a free, standalone product — it is not a funnel into a paid
    offering, and using it does not require any relationship with Brick &amp; Mortar's other
    services.
  </p>

  <h2 id="support">Support</h2>
  <p>
    Questions, issues, or approval-review requests: reach Brick &amp; Mortar AI via
    <a href="https://brickandmortar.dev">brickandmortar.dev</a>.
  </p>

  <footer>
    <a href="/">&larr; Back</a> · <a href="/privacy">Privacy</a> · Built by <a href="https://brickandmortar.dev">Brick &amp; Mortar AI</a>
  </footer>
</body>
</html>`;
}
