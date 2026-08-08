import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";

const InputSchema = z.object({
  business_name: z.string().describe("The business's name as it appears on its own signage/website."),
  city_metro: z.string().describe("City + state/region, e.g. 'Wichita, KS' — disambiguates same-named businesses."),
  category: z.string().optional().describe("Category if known — helps set expectations for review volume/velocity norms."),
});

// PLACEHOLDER — replaced with a full framework in the next build pass.
const PAYLOAD: FrameworkPayload = {
  tool: "review_intelligence",
  framework: "PLACEHOLDER — TODO before ship.",
  research_procedure: [{ step: 1, instruction: "PLACEHOLDER — TODO before ship." }],
  output_schema: { placeholder: "TODO" },
  quality_rubric: { good_looks_like: ["TODO"], common_failure_modes: ["TODO"] },
  caveats: ["TODO"],
};

export function registerReviewIntelligence(server: McpServer, env: Env): void {
  server.registerTool(
    "review_intelligence",
    {
      title: "Review Intelligence",
      description:
        "Mines public reviews for signal: a complaint taxonomy, theme extraction, sentiment trajectory over time, the differentiators customers actually cite, and red flags for a buyer.\n\n" +
        "Example invocations:\n" +
        '- "Mine the reviews for Al\'s Breakfast in Minneapolis for real patterns, not just a star rating"\n' +
        '- "What are customers actually complaining about at Perfect Image Salon in Wichita?"\n' +
        '- "I\'m evaluating this restaurant as a buyer — what do the reviews reveal that the rating doesn\'t?"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Review Intelligence", readOnlyHint: true, openWorldHint: true },
    },
    withPolicy("review_intelligence", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
