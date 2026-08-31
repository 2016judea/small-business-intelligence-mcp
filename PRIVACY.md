# Privacy Policy — Small Business Intelligence by Brick & Mortar

Last updated: 2026-08-31

This is a free [MCP](https://modelcontextprotocol.io) server. Most of its tools
ship analytical frameworks, not data — every research step is executed by *your
own* AI assistant, using *your own* web search. This server calls no third party
on your behalf, ever.

Three tools are exceptions, and they are the only places anything leaves your
session. This page is the authority on what they send; the same text is served at
`/privacy` and the two are updated together.

## The two that fetch records

`twin_cities_datasets` and `twin_cities_records` call one external service —
[brickandmortar.dev/api/export](https://brickandmortar.dev/api/export), run by us
— and send it the dataset you named, the filter and columns you asked for, and,
only if you supply one, the street address you asked about. Nothing else from
your conversation is transmitted, and the address is not stored: those tools
request a bounded preview, and the export service logs only real file downloads.

## The one that sends a message

`request_a_feature` exists so you can tell us what this server should do and does
not. When — and only when — your assistant calls it, the text of your request is
sent to us and lands in a person's email inbox, along with the reply address you
gave if you gave one, the city or sector it concerns, your assistant's one-line
summary of what you were trying to do, and the name your MCP client reports
itself as.

That is a message you asked to send, so unlike everything below it is kept: we
read it, and we keep it while we decide whether to build the thing. If you leave
no email address we have no way to identify you and will not try. The destination
is fixed in the source and is not a parameter — this tool cannot be used to reach
anyone but us.

## What we log

- A **hashed** representation of your IP address, rotated daily (a new hash every
  UTC day, computed with a one-way hash — we cannot reverse it back to your real
  IP), paired with a per-tool call count. This exists solely so a future paid tier
  (not active today — see below) can enforce a daily free-usage limit without
  storing anything that identifies you across days.
- Nothing else. No request bodies, no tool arguments, no business names you
  research, no conversation content, no analytics or tracking pixels. The one
  exception is a request you deliberately send with `request_a_feature`,
  described above — that one is a message to us, and a message nobody keeps is a
  message nobody answers.

## What we never see

- The actual research your AI assistant performs after calling a framework tool —
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
