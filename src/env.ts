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
}
