/**
 * Resolves a per-request identity for usage accounting.
 *
 * Today: anonymous, hashed IP, rotating daily so no long-lived fingerprint
 * of a caller ever accumulates in KV. Later, once OAuth ships: read the
 * subject off `ctx.http.authInfo` (populated by the SDK once a validated
 * access token is wired up — see src/oauth/stub.ts) instead of the IP hash.
 * Every call site (src/middleware/context.ts) stays unchanged either way.
 */
export async function resolveIdentity(request: Request | undefined): Promise<string> {
  // brickandmortar.dev/mcp is a Vercel rewrite onto this Worker, so for every
  // caller who used the address we publish, cf-connecting-ip is VERCEL'S proxy
  // (a handful of AWS IPs in Columbus/Ashburn) and every such caller collapsed
  // into one identity — found 2026-09-04, when three `usage:` keys turned out to
  // be three proxy IPs rather than three people. Vercel forwards the real client
  // in x-vercel-proxied-for; only a request that actually came through the
  // proxy carries it. A direct caller could spoof the header, which matters
  // only to the dormant metered policy, and buys a spoofer a fresh daily quota
  // — acceptable for a free service; revisit if metering ever goes live.
  const ip =
    request?.headers.get("x-vercel-proxied-for")?.split(",")[0]?.trim() ||
    request?.headers.get("cf-connecting-ip") ||
    "unknown";
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}:${day}`));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
