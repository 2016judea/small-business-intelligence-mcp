# Privacy Policy — Small Business Intelligence by Brick & Mortar

Last updated: 2026-08-08

This is a free [MCP](https://modelcontextprotocol.io) server. It ships analytical
frameworks, not data — every research step is executed by *your own* AI assistant,
using *your own* web search. This server never performs research on your behalf,
and never calls any external API, data provider, or third-party service itself.

## What we log

- A **hashed** representation of your IP address, rotated daily (a new hash every
  UTC day, computed with a one-way hash — we cannot reverse it back to your real
  IP), paired with a per-tool call count. This exists solely so a future paid tier
  (not active today — see below) can enforce a daily free-usage limit without
  storing anything that identifies you across days.
- Nothing else. No request bodies, no tool arguments, no business names you
  research, no conversation content, no analytics or tracking pixels.

## What we never see

- The actual research your AI assistant performs after calling one of our tools —
  that happens entirely in your own AI session, using your own web search. We are
  not in that loop at all.
- Your real IP address (only a rotating one-way hash, described above).
- Any account information — there is no account. This server requires no
  authentication and no sign-up.

## No sale of data

We don't have data to sell. The hashed-IP usage counters described above are the
entirety of what this server retains, and they exist only to support a metered
free tier that is built but **not currently active** — every call is allowed today,
with no limit.

## Monetization

This product is free today with no usage limit. If a metered tier is ever
activated, it will deny excess calls with a plain-language message and an upgrade
link — never silently, and never by degrading the quality of a response.

## Changes

If this policy changes in a way that affects what's logged, this page and the
`PRIVACY.md` file in the source repository will be updated together, dated at
the top.

## Contact

Brick & Mortar AI — [brickandmortar.dev](https://brickandmortar.dev)
