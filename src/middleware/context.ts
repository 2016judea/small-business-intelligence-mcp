import type { CallToolResult, InputRequiredResult, ServerContext } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
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
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "usage_limit_reached",
                tool: toolName,
                message: decision.message,
                upgrade_url: decision.upgradeUrl,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    const result = await handler(args, ctx);
    await ledger.increment(identity);
    return result;
  };
}
