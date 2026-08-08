/** Cloudflare Worker bindings + vars, as declared in wrangler.jsonc. */
export interface Env {
  USAGE_LEDGER: KVNamespace;
  /** "allow_all" (default, shipped) or "metered" (implemented, dormant). */
  POLICY_MODE?: string;
  POLICY_METERED_DAILY_LIMIT?: string;
  POLICY_UPGRADE_URL?: string;
}
