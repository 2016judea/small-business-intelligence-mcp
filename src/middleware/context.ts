import type { CallToolResult, InputRequiredResult, ServerContext } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { frameworkResult } from "../tools/types.js";
import { resolveIdentity } from "./identity.js";
import { KVUsageLedger } from "./ledger.js";
import { checkPolicy } from "./policy.js";
import { KVToolStats } from "./stats.js";

type ToolResult = CallToolResult | InputRequiredResult;
type ToolHandler<Args> = (args: Args, ctx: ServerContext) => ToolResult | Promise<ToolResult>;

/**
 * The single seam every tool passes through — resolves
 * identity, checks policy, and only when the policy denies, short-circuits
 * with a clean MCP tool result. Denials are never `isError: true` and never
 * an HTTP-level rejection: the calling model reads the denial exactly like
 * any other tool output and relays it to the user in plain language,
 * instead of surfacing what looks like a broken tool.
 */
/**
 * A denial, shaped for the schema of the tool being denied.
 *
 * WHY THIS IS A PARAMETER NOW. Every tool declares an `outputSchema`, so the SDK
 * validates `structuredContent` on EVERY result including this short-circuit — and
 * the default below conforms to `FrameworkPayloadSchema`, which the nine
 * methodology tools share. The Twin Cities tools added 2026-08-20 return a
 * different shape, so handing them the framework-shaped denial would fail
 * validation and the SDK would wrap it as `isError: true`: a clean, intentional
 * denial turned into what looks like a broken tool, on the one code path that is
 * dormant by default and therefore never exercised.
 *
 * One middleware with a supplied denial rather than two middlewares, because the
 * identity/ledger/stats half is the part that must not diverge.
 */
export type DenialBuilder = (message: string, upgradeUrl: string) => ToolResult;

export function withPolicy<Args>(
  toolName: string,
  env: Env,
  handler: ToolHandler<Args>,
  onDenied?: DenialBuilder,
): ToolHandler<Args> {
  return async (args, ctx) => {
    const identity = await resolveIdentity(ctx.http?.req);
    const ledger = new KVUsageLedger(env.USAGE_LEDGER);
    const decision = await checkPolicy(identity, ledger, env);

    if (!decision.allowed && onDenied) {
      return onDenied(
        decision.message ?? "You've reached today's free-tier limit.",
        decision.upgradeUrl ?? "https://brickandmortar.dev",
      );
    }

    if (!decision.allowed) {
      // Every tool declares an outputSchema, so the SDK validates
      // structuredContent against FrameworkPayloadSchema on every result —
      // including this one. A denial has to be a fully schema-conformant
      // payload (empty-but-valid placeholders + the `notice` field) or the
      // SDK itself rejects it and turns it into exactly the broken-looking
      // isError result this whole seam exists to avoid.
      return frameworkResult({
        tool: toolName,
        framework: "Not applicable — the free daily usage limit was reached before this tool ran.",
        research_procedure: [],
        output_schema: {},
        quality_rubric: { good_looks_like: [], common_failure_modes: [] },
        caveats: [],
        notice: {
          status: "usage_limit_reached",
          message: decision.message ?? "You've reached today's free-tier limit.",
          upgrade_url: decision.upgradeUrl ?? "https://brickandmortar.dev",
        },
      });
    }

    const result = await handler(args, ctx);
    await ledger.increment(identity);
    // Aggregate-only, non-identifying — see stats.ts's docstring. Recorded
    // regardless of POLICY_MODE; this is product signal, not rate limiting.
    await new KVToolStats(env.USAGE_LEDGER).recordCall(toolName);
    return result;
  };
}
