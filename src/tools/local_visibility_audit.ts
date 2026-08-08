import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";

const InputSchema = z.object({
  business_name: z.string().describe("The business's name as it appears on its own signage/website."),
  city_metro: z.string().describe("City + state/region, e.g. 'Aurora, CO'."),
  category: z.string().optional().describe("Category if known — narrows which map-pack searches are the right ones to check."),
});

// PLACEHOLDER — replaced with a full framework in the next build pass.
const PAYLOAD: FrameworkPayload = {
  tool: "local_visibility_audit",
  framework: "PLACEHOLDER — TODO before ship.",
  research_procedure: [{ step: 1, instruction: "PLACEHOLDER — TODO before ship." }],
  output_schema: { placeholder: "TODO" },
  quality_rubric: { good_looks_like: ["TODO"], common_failure_modes: ["TODO"] },
  caveats: ["TODO"],
};

export function registerLocalVisibilityAudit(server: McpServer, env: Env): void {
  server.registerTool(
    "local_visibility_audit",
    {
      title: "Local Visibility Audit",
      description:
        "Audits a business's local search presence: map-pack factors, listing consistency, category selection, site fundamentals — what to check, and in what order — returned as a scored checklist.\n\n" +
        "Example invocations:\n" +
        '- "Audit the local search visibility for Day by Day Cafe in Saint Paul, MN"\n' +
        '- "Why doesn\'t this brewery show up in the map pack for \'brewery near me\'?"\n' +
        '- "Give me a scored visibility checklist for a hair salon in Aurora, CO"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Local Visibility Audit", readOnlyHint: true, openWorldHint: true },
    },
    withPolicy("local_visibility_audit", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
