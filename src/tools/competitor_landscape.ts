import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";

const InputSchema = z.object({
  category: z.string().describe("The business category/vertical, e.g. 'nail salon', 'brewery taproom'."),
  city_metro: z.string().describe("City + state/region defining the trade area, e.g. 'Denver, CO'."),
  radius_note: z.string().optional().describe("Optional — a specific radius or neighborhood if the default trade-area logic in the procedure shouldn't apply."),
});

// PLACEHOLDER — replaced with a full framework in the next build pass.
const PAYLOAD: FrameworkPayload = {
  tool: "competitor_landscape",
  framework: "PLACEHOLDER — TODO before ship.",
  research_procedure: [{ step: 1, instruction: "PLACEHOLDER — TODO before ship." }],
  output_schema: { placeholder: "TODO" },
  quality_rubric: { good_looks_like: ["TODO"], common_failure_modes: ["TODO"] },
  caveats: ["TODO"],
};

export function registerCompetitorLandscape(server: McpServer, env: Env): void {
  server.registerTool(
    "competitor_landscape",
    {
      title: "Competitor Landscape",
      description:
        "Maps the local competitive set for a category + metro: true competitors vs. adjacent players, a positioning matrix, and saturation signals.\n\n" +
        "Example invocations:\n" +
        '- "Map the competitive landscape for coffee shops in Saint Paul, MN"\n' +
        '- "How saturated is the nail salon market in Aurora, CO?"\n' +
        '- "Who are the real competitors to a new brewery taproom opening in the North Loop, Minneapolis?"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Competitor Landscape", readOnlyHint: true, openWorldHint: true },
    },
    withPolicy("competitor_landscape", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
