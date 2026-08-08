import type { CallToolResult, InputRequiredResult, ServerContext } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { frameworkResult } from "../tools/types.js";
import { resolveIdentity } from "./identity.js";
import { KVUsageLedger } from "./ledger.js";
import { checkPolicy } from "./policy.js";

type ToolResult = CallToolResult | InputRequiredResult;
type ToolHandler<Args> = (args: Args, ctx: ServerContext) => ToolResult | Promise<ToolResult>;

/**
 * The single seam every one of the 8 tools passes through — resolves
 * identity, checks policy, and only when the policy denies, short-circuits
 * with a clean MCP tool result. Denials are never `isError: true` and never
 * an HTTP-level rejection: the calling model reads the denial exactly like
 * any other tool output and relays it to the user in plain language,
 * instead of surfacing what looks like a broken tool.
 */
export function withPolicy<Args>(toolName: string, env: Env, handler: ToolHandler<Args>): ToolHandler<Args> {
  return async (args, ctx) => {
    const identity = await resolveIdentity(ctx.http?.req);
    const ledger = new KVUsageLedger(env.USAGE_LEDGER);
    const decision = await checkPolicy(identity, ledger, env);

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
    return result;
  };
}
