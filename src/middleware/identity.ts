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
  const ip = request?.headers.get("cf-connecting-ip") ?? "unknown";
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}:${day}`));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
