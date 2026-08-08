import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";

const InputSchema = z.object({
  category: z.string().describe("The business category/vertical, e.g. 'massage spa', 'full-service restaurant'."),
  city_metro: z.string().describe("City + state/region defining the comparison market, e.g. 'Wichita, KS'."),
  services: z
    .array(z.string())
    .optional()
    .describe("Specific services/items to benchmark if known (e.g. ['30-min massage', 'gel manicure']) — otherwise the procedure derives a comparable bundle."),
});

// PLACEHOLDER — replaced with a full framework in the next build pass.
const PAYLOAD: FrameworkPayload = {
  tool: "pricing_benchmark",
  framework: "PLACEHOLDER — TODO before ship.",
  research_procedure: [{ step: 1, instruction: "PLACEHOLDER — TODO before ship." }],
  output_schema: { placeholder: "TODO" },
  quality_rubric: { good_looks_like: ["TODO"], common_failure_modes: ["TODO"] },
  caveats: ["TODO"],
};

export function registerPricingBenchmark(server: McpServer, env: Env): void {
  server.registerTool(
    "pricing_benchmark",
    {
      title: "Pricing Benchmark",
      description:
        "Builds a defensible local pricing comparison within a category: how to normalize across differing service bundles, and what to do when competitors don't publish prices at all.\n\n" +
        "Example invocations:\n" +
        '- "Benchmark gel manicure pricing across nail salons in Denver, CO"\n' +
        '- "Is this brewery\'s pint pricing in line with the Twin Cities taproom market?"\n' +
        '- "Build a pricing comparison for full-service restaurants in Wichita, KS when most don\'t list prices online"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Pricing Benchmark", readOnlyHint: true, openWorldHint: true },
    },
    withPolicy("pricing_benchmark", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
