import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";

const InputSchema = z.object({
  category: z.string().describe("The business category/vertical to scan for whitespace, e.g. 'coffee shop', 'massage spa'."),
  city_metro: z.string().describe("City + state/region defining the market, e.g. 'Aurora, CO'."),
});

// PLACEHOLDER — replaced with a full framework in the next build pass.
const PAYLOAD: FrameworkPayload = {
  tool: "market_opportunity_scan",
  framework: "PLACEHOLDER — TODO before ship.",
  research_procedure: [{ step: 1, instruction: "PLACEHOLDER — TODO before ship." }],
  output_schema: { placeholder: "TODO" },
  quality_rubric: { good_looks_like: ["TODO"], common_failure_modes: ["TODO"] },
  caveats: ["TODO"],
};

export function registerMarketOpportunityScan(server: McpServer, env: Env): void {
  server.registerTool(
    "market_opportunity_scan",
    {
      title: "Market Opportunity Scan",
      description:
        "Gap analysis for a category x metro: detects underserved demand, oversaturation, and genuine whitespace using only public signals — for someone deciding whether/where to open, expand, or invest.\n\n" +
        "Example invocations:\n" +
        '- "Is there whitespace for a new brewery taproom in the North Loop, Minneapolis?"\n' +
        '- "Scan the nail salon market in Aurora, CO for underserved demand"\n' +
        '- "Where in Wichita, KS is full-service restaurant demand outrunning supply?"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Market Opportunity Scan", readOnlyHint: true, openWorldHint: true },
    },
    withPolicy("market_opportunity_scan", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
