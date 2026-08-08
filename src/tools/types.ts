import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/server";

/**
 * Every one of the 8 tools returns this shape. The server ships
 * methodology, not data: `research_procedure` is what the calling model
 * executes with its own web search; `output_schema` is the exact structure
 * of the finished deliverable the model should produce from that research;
 * `quality_rubric` and `caveats` are what separate a rigorous pass from a
 * lazy "searched and summarized" one.
 */
export const ResearchStepSchema = z.object({
  step: z.number().int().positive(),
  instruction: z.string().describe("A concrete, opinionated action — never 'search the web and summarize.'"),
  guidance: z.string().optional().describe("What separates a good execution of this step from a lazy one."),
});

export const QualityRubricSchema = z.object({
  good_looks_like: z.array(z.string()),
  common_failure_modes: z.array(z.string()),
});

export const FrameworkPayloadSchema = z.object({
  tool: z.string(),
  subject: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Echoes the tool's input arguments back, so a long multi-tool session stays anchored to the right business/category/metro."),
  framework: z.string().describe("The analytical model/lens this tool applies."),
  research_procedure: z.array(ResearchStepSchema),
  output_schema: z.record(z.string(), z.unknown()).describe("Exact structure of the finished deliverable."),
  quality_rubric: QualityRubricSchema,
  caveats: z.array(z.string()),
});

export type FrameworkPayload = z.infer<typeof FrameworkPayloadSchema>;

/** Wraps a framework payload as both the text content and structured content of a tool result. */
export function frameworkResult(payload: FrameworkPayload): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}
