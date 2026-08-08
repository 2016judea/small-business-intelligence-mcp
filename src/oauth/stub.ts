/**
 * Real, ready OAuth 2.1 + PKCE discovery handlers — NOT mounted anywhere.
 *
 * Per the MCP 2026-07-28 spec (verified against modelcontextprotocol.io
 * before writing this file), authorization is OPTIONAL. A server that
 * doesn't require auth is spec-compliant by not doing the OAuth dance at
 * all: no 401 challenge on /mcp, no Protected Resource Metadata document.
 * Serving a PRM for a resource that isn't actually protected would be the
 * non-compliant move (RFC 9728 describes *protected* resources).
 *
 * So this file exists, is type-checked, and is ready — but src/index.ts
 * does not call it. Activating auth later is additive:
 *   1. Fill in the real `oauthMetadata` below (issuer, authorization_endpoint,
 *      token_endpoint — from whatever AS you stand up).
 *   2. In src/index.ts, call `oauthMetadataResponse(request, options)` before
 *      the /mcp route and return its result when it's not undefined.
 *   3. Point src/middleware/identity.ts at `ctx.http.authInfo` instead of the
 *      hashed-IP fallback.
 *   4. Flip POLICY_MODE if you want the metered policy active behind auth.
 * No restructuring of tools, middleware, or routing required.
 */
import type { AuthMetadataOptions } from "@modelcontextprotocol/server";

export function buildAuthMetadataOptions(serverUrl: URL): AuthMetadataOptions {
  return {
    resourceServerUrl: serverUrl,
    resourceName: "Small Business Intelligence by Brick & Mortar",
    oauthMetadata: {
      // TODO: replace with the real Authorization Server's issuer once one exists.
      issuer: "https://auth.brickandmortar.dev",
      authorization_endpoint: "https://auth.brickandmortar.dev/authorize",
      token_endpoint: "https://auth.brickandmortar.dev/token",
      registration_endpoint: "https://auth.brickandmortar.dev/register",
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    },
  };
}
