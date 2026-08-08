export function privacyPageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Privacy — Small Business Intelligence</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    max-width: 680px;
    margin: 0 auto;
    padding: 4rem 1.5rem 6rem;
    line-height: 1.65;
    color: #1a1a1a;
    background: #fff;
  }
  @media (prefers-color-scheme: dark) { body { color: #e8e8e8; background: #111; } a { color: #7db8ff; } }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.05rem; margin-top: 2rem; }
  .updated { color: #888; font-size: 0.9rem; }
  a { color: #0a5cd4; }
</style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p class="updated">Last updated: 2026-08-08</p>

  <p>
    This is a free <a href="https://modelcontextprotocol.io">MCP</a> server. It ships analytical
    frameworks, not data — every research step is executed by <em>your own</em> AI assistant, using
    <em>your own</em> web search. This server never performs research on your behalf, and never calls
    any external API, data provider, or third-party service itself.
  </p>

  <h2>What we log</h2>
  <p>
    A <strong>hashed</strong> representation of your IP address, rotated daily (a new hash every UTC
    day, computed with a one-way hash — we cannot reverse it back to your real IP), paired with a
    per-tool call count. This exists solely so a future paid tier (not active today) can enforce a
    daily free-usage limit without storing anything that identifies you across days. Nothing else —
    no request bodies, tool arguments, business names, conversation content, or tracking pixels.
  </p>

  <h2>What we never see</h2>
  <p>
    The actual research your AI assistant performs after calling a tool — that happens entirely in
    your own AI session. Your real IP address. Any account information — there is no account, and no
    authentication is required to use this server.
  </p>

  <h2>No sale of data</h2>
  <p>
    We don't have data to sell. The hashed-IP usage counters above are the entirety of what this
    server retains.
  </p>

  <h2>Monetization</h2>
  <p>
    This product is free today with no usage limit. If a metered tier is ever activated, it will deny
    excess calls with a plain-language message and an upgrade link — never silently, and never by
    degrading response quality.
  </p>

  <h2>Contact</h2>
  <p>Brick &amp; Mortar AI — <a href="https://brickandmortar.dev">brickandmortar.dev</a></p>

  <p><a href="/">&larr; Back</a></p>
</body>
</html>`;
}
