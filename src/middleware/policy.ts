import type { UsageLedger } from "./ledger.js";

export interface PolicyEnv {
  POLICY_MODE?: string;
  POLICY_METERED_DAILY_LIMIT?: string;
  POLICY_UPGRADE_URL?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  message?: string;
  upgradeUrl?: string;
}

const DEFAULT_DAILY_LIMIT = 50;
const DEFAULT_UPGRADE_URL = "https://brickandmortar.dev";

/**
 * `allow_all` (the shipped default) always allows — this product is free
 * with no gate at launch. `metered` is fully implemented but not activated
 * by any deploy today; flipping POLICY_MODE in wrangler.jsonc is the whole
 * activation step.
 */
export async function checkPolicy(
  identity: string,
  ledger: UsageLedger,
  env: PolicyEnv,
): Promise<PolicyDecision> {
  const mode = env.POLICY_MODE ?? "allow_all";
  if (mode !== "metered") {
    return { allowed: true };
  }

  const limit = Number.parseInt(env.POLICY_METERED_DAILY_LIMIT ?? String(DEFAULT_DAILY_LIMIT), 10);
  const count = await ledger.getCount(identity);
  if (count >= limit) {
    return {
      allowed: false,
      message: `You've reached today's free-tier limit (${limit} calls) for Small Business Intelligence tools. It resets at 00:00 UTC.`,
      upgradeUrl: env.POLICY_UPGRADE_URL ?? DEFAULT_UPGRADE_URL,
    };
  }
  return { allowed: true };
}
