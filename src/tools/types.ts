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
/**
 * EVERY `.describe()` BELOW IS PAID FOR NINE TIMES. This schema is attached as
 * `outputSchema` to all nine tools, so each string is serialised into
 * tools/list once per tool and sits in the client's context for the whole
 * session whether or not any tool is ever called. Measured 2026-08-16: the
 * envelope is ~2.0 KB per tool and tools/list ~47 KB total, of which the great
 * majority is this object repeated. Descriptions here earn their place only if
 * a model would misuse the field without them — anything explaining the design
 * to a human belongs in a comment like this one, which costs nothing.
 */
export const ResearchStepSchema = z.object({
  step: z.number().int().positive(),
  instruction: z.string(),
  guidance: z.string().optional(),
});

export const QualityRubricSchema = z.object({
  good_looks_like: z.array(z.string()),
  common_failure_modes: z.array(z.string()),
});

export const NoticeSchema = z.object({
  status: z.literal("usage_limit_reached"),
  message: z.string(),
  upgrade_url: z.string(),
});

export const FrameworkPayloadSchema = z.object({
  tool: z.string(),
  // Echoes the tool's input back, so a long multi-tool session stays anchored
  // to the right business/category/metro.
  subject: z.record(z.string(), z.unknown()).optional(),
  framework: z.string(),
  research_procedure: z.array(ResearchStepSchema),
  // The shape of the finished deliverable the model should produce. Described
  // in prose per tool, which is where the per-tool detail belongs.
  output_schema: z.record(z.string(), z.unknown()),
  quality_rubric: QualityRubricSchema,
  caveats: z.array(z.string()),
  // Kept — this one changes how a model reads the whole payload, so it is worth
  // its nine copies. See src/middleware/policy.ts.
  notice: NoticeSchema.optional().describe(
    "Present ONLY when the request was denied by usage policy instead of executed. When present, every other field is an empty placeholder and must not be reported as a framework.",
  ),
});

export type FrameworkPayload = z.infer<typeof FrameworkPayloadSchema>;

/** Wraps a framework payload as both the text content and structured content of a tool result. */
export function frameworkResult(payload: FrameworkPayload): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}
