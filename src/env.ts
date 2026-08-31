/** Cloudflare Worker bindings + vars, as declared in wrangler.jsonc. */
export interface Env {
  USAGE_LEDGER: KVNamespace;
  /** "allow_all" (default, shipped) or "metered" (implemented, dormant). */
  POLICY_MODE?: string;
  POLICY_METERED_DAILY_LIMIT?: string;
  POLICY_UPGRADE_URL?: string;
  /**
   * Origin the Twin Cities tools call. A var rather than a constant so a local
   * `wrangler dev` can be pointed at a local bricks server; unset means
   * production, which is what ships.
   */
  BRICKS_ORIGIN?: string;
  /**
   * Per-submission token OpenAI issues to prove we control this host, served
   * verbatim as text/plain at /.well-known/openai-apps-challenge. A SECRET
   * rather than a var so rotating it is `wrangler secret put`, not a deploy.
   */
  OPENAI_APPS_CHALLENGE?: string;
  /**
   * Shared secret the `request_a_feature` tool presents to
   * brickandmortar.dev/api/mcp-feedback, which refuses everything without it.
   * A SECRET, not a var: it is the only thing standing between a public,
   * unauthenticated MCP server and an open mail relay, so it must never be
   * readable in wrangler.jsonc or in this repo's history.
   *   wrangler secret put MCP_FEEDBACK_TOKEN
   * Unset, the tool files nothing and says so — it never reports a send that
   * did not happen.
   */
  MCP_FEEDBACK_TOKEN?: string;
}
