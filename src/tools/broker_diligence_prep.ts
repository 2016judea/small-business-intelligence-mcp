import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";

const InputSchema = z.object({
  business_name: z.string().describe("The target business's name."),
  city_metro: z.string().describe("City + state/region, e.g. 'Denver, CO'."),
  category: z.string().optional().describe("Category if known — determines the relevant SDE-multiple range."),
  asking_price: z.number().optional().describe("Listed asking price, if known — used to sanity-check against the multiple range, never to validate it."),
});

// PLACEHOLDER — replaced with a full framework in the next build pass.
const PAYLOAD: FrameworkPayload = {
  tool: "broker_diligence_prep",
  framework: "PLACEHOLDER — TODO before ship.",
  research_procedure: [{ step: 1, instruction: "PLACEHOLDER — TODO before ship." }],
  output_schema: { placeholder: "TODO" },
  quality_rubric: { good_looks_like: ["TODO"], common_failure_modes: ["TODO"] },
  caveats: ["TODO"],
};

export function registerBrokerDiligencePrep(server: McpServer, env: Env): void {
  server.registerTool(
    "broker_diligence_prep",
    {
      title: "Broker Diligence Prep",
      description:
        "Pre-diligence framework for a business broker or buyer evaluating a target: SDE framing, typical multiples by category (as caveated ranges the model must verify are current), a red-flag checklist, and seller questions.\n\n" +
        "Example invocations:\n" +
        '- "Prep me for diligence on a brewery taproom listed in Minneapolis, MN"\n' +
        '- "What questions should I ask the seller of a hair salon in Wichita, KS before I make an offer?"\n' +
        '- "This restaurant is asking $650K — what red flags should I check before taking that seriously?"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Broker Diligence Prep", readOnlyHint: true, openWorldHint: true },
    },
    withPolicy("broker_diligence_prep", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
