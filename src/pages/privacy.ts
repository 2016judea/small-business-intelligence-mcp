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
  <p class="updated">Last updated: 2026-08-20</p>

  <p>
    This is a free <a href="https://modelcontextprotocol.io">MCP</a> server. Most of its tools ship
    analytical frameworks rather than data — every research step in those is executed by <em>your
    own</em> AI assistant, using <em>your own</em> web search, and they call nothing at all.
  </p>

  <p>
    <strong>Two tools are different, and this section is here because of them.</strong>
    <code>twin_cities_datasets</code> and <code>twin_cities_records</code> return real public
    records, and to do that they call one external service:
    <a href="https://brickandmortar.dev/api/export">brickandmortar.dev/api/export</a>, which is run
    by us. No other tool calls anything, and no tool calls any third party.
  </p>

  <p>
    <strong>One more tool is different, and it is the only one that sends anything about you
    anywhere.</strong> <code>request_a_feature</code> exists so you can tell us what this server
    should do and does not. When — and only when — your assistant calls it, the text of your request
    is sent to us and lands in a person's email inbox, along with the reply address you gave if you
    gave one, the city or sector the request is about, your assistant's one-line summary of what you
    were trying to do, and the name your MCP client reports itself as. That is a message you asked to
    send, so it is kept: we read it, and we keep it while we decide whether to build the thing. If
    you leave no email address we have no way to identify you and will not try. Nothing else from
    your conversation is transmitted, and no other tool on this server sends anything about you
    anywhere at all.
  </p>

  <p>
    <strong>What those two send:</strong> the dataset you named, the filter (“scope”) and columns you
    asked for, and — only if you supply one — the street address you asked about. Nothing else from
    your conversation is transmitted. <strong>The address is not stored:</strong> those tools request
    a bounded preview, and the export service writes its download log only for actual file
    downloads, which a preview is not. If you then follow a download link yourself, that fetch is
    logged as: the dataset, filter, format, row and byte count, whether the caller looked like a
    browser or a script, the referring host, the channel that sent you, and a daily-rotated one-way
    hash of the calling IP. No address, and no file contents.
  </p>

  <h2>What we log</h2>
  <p>
    A <strong>hashed</strong> representation of your IP address, rotated daily (a new hash every UTC
    day, computed with a one-way hash — we cannot reverse it back to your real IP), paired with a
    per-tool call count. This exists solely so a future paid tier (not active today) can enforce a
    daily free-usage limit without storing anything that identifies you across days.
  </p>
  <p>
    Separately, we keep an <strong>aggregate, non-identifying</strong> count of how many times each
    tool is called per day, split by the <em>kind</em> of client that called it — e.g.
    "business_teardown: 340 calls on 2026-08-09, 300 from Claude, 40 from registry crawlers." The
    kind is one of eight coarse buckets read off the User-Agent header (Claude, ChatGPT, a crawler, a
    browser, a generic HTTP library…), never the header itself. This count has no connection to the
    hashed-IP counter above, carries no identity of any kind, and is used only to understand which
    tools are actually useful and whether a person or a scanner is using them.
  </p>
  <p>
    Our host, Cloudflare, keeps its own request log for a few days: the User-Agent header, the coarse
    geography it derives from the IP (city, country), and — added by us — the JSON-RPC method of the
    request and, for a tool call, the tool's <em>name</em>. Never the arguments. We read that log to
    tell people apart from the automated scanners that make up most of our traffic.
  </p>
  <p>
    Nothing else is logged — no request bodies, tool arguments, business names, conversation
    content, or tracking pixels. The one exception is the request you deliberately send with
    <code>request_a_feature</code>, described above: that one is a message to us, and it is kept
    because a message nobody keeps is a message nobody answers.
  </p>

  <h2>What we never see</h2>
  <p>
    The actual research your AI assistant performs after calling a framework tool — that happens
    entirely in your own AI session. Your real IP address. Any account information — there is no
    account, and no authentication is required to use this server. For the two Twin Cities tools and
    for <code>request_a_feature</code>, everything they transmit is listed above and nothing beyond
    it: not your conversation, not your other questions, not who you are.
  </p>

  <h2>No sale of data</h2>
  <p>
    The public records these tools return are free to anyone, with no account and no rate limit —
    that is deliberate, not a trial. We have no personal data to sell: the hashed usage counters
    above are the entirety of what is retained about callers.
  </p>

  <h2>Monetization</h2>
  <p>
    This product is free today with no usage limit. If a metered tier is ever activated, it will deny
    excess calls with a plain-language message and an upgrade link — never silently, and never by
    degrading response quality.
  </p>

  <h2>Contact</h2>
  <p>Brick &amp; Mortar AI — <a href="https://brickandmortar.dev">brickandmortar.dev</a></p>

  <p><a href="/">&larr; Back</a> · <a href="/docs">Documentation</a></p>
</body>
</html>`;
}
