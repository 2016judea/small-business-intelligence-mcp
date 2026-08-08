import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";

const InputSchema = z.object({
  business_name: z.string().describe("The business the report is about."),
  audience: z
    .enum(["owner", "broker", "buyer", "investor", "general"])
    .describe("Who will read this report — drives section order, tone, and what gets emphasized vs. cut."),
  completed_analyses: z
    .array(
      z.object({
        tool: z.string().describe("Which of the other 7 tools produced this analysis, e.g. 'business_teardown'."),
        summary: z.string().describe("The finished deliverable the calling model produced by following that tool's framework — not the raw framework payload itself."),
      }),
    )
    .describe("The completed write-ups from any prior tool calls this session, to be assembled — not re-researched."),
});

// PLACEHOLDER — replaced with a full framework in the next build pass.
const PAYLOAD: FrameworkPayload = {
  tool: "compose_report",
  framework: "PLACEHOLDER — TODO before ship.",
  research_procedure: [{ step: 1, instruction: "PLACEHOLDER — TODO before ship." }],
  output_schema: { placeholder: "TODO" },
  quality_rubric: { good_looks_like: ["TODO"], common_failure_modes: ["TODO"] },
  caveats: ["TODO"],
};

export function registerComposeReport(server: McpServer, env: Env): void {
  server.registerTool(
    "compose_report",
    {
      title: "Compose Report",
      description:
        "Assembles the outputs of any prior Small Business Intelligence tool calls into one polished, client-ready report: section order, executive-summary rules, evidence-citation standards, and tone guidance matched to the audience. This is what makes a multi-tool session feel like a finished product, not a pile of separate answers.\n\n" +
        "Example invocations:\n" +
        '- "I\'ve run a teardown and a review-intelligence pass on this restaurant — compose it into a report for the owner"\n' +
        '- "Assemble everything we\'ve found on this brewery into a broker-facing diligence report"\n' +
        '- "Turn the teardown and competitor landscape into a report I can hand an investor"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Compose Report", readOnlyHint: true, openWorldHint: true },
    },
    withPolicy("compose_report", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
