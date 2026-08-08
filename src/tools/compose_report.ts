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

const PAYLOAD: FrameworkPayload = {
  tool: "compose_report",
  framework:
    "The Verdict Ladder — an inverted pyramid purpose-built for assembling MULTIPLE finished analyses into one report, not just reordering a single one. Four rungs, each one further from the reader's first ten seconds of attention: (1) Verdict — the single most decision-relevant finding, stated plainly, regardless of which source tool produced it or when it was called; (2) Prioritized synthesis — the top few cross-cutting themes, each merging every completed_analyses input that touched it, ranked by audience-specific weighting rather than source order; (3) Supporting detail — real, cited material that didn't clear the priority bar, kept but demoted below the fold; (4) Evidence appendix — the full citation trail plus an explicit contradiction ledger. This works for a business-intelligence report specifically because the reader (owner, broker, buyer, investor) is making a decision, not following a narrative arc — they need the answer before the method, but they also need to verify the answer wasn't invented, which a bare inverted pyramid with no appendix doesn't guarantee. The ladder also solves a problem that's unique to assembly and doesn't exist in any single research tool: several tools were called in whatever order the calling model happened to sequence them, and different tools sometimes measure the same underlying fact differently (a review count pulled at different times, a competitor set drawn with a different radius assumption). Ranking by decision-relevance instead of call order, and surfacing disagreement instead of silently resolving it, is what turns a pile of separate tool answers into one report that reads as a single coherent verdict.",
  research_procedure: [
    {
      step: 1,
      instruction:
        "Inventory the completed_analyses array: for each entry, note which tool produced it, which domain it covers (presence/perception, competitive set, pricing, review signal, visibility, diligence, market opportunity), and whether it reads as a genuinely finished write-up or a thin, hedge-heavy, or clearly unfinished pass.",
      guidance: "A thin or unfinished input is itself a fact about this report's coverage — carry it forward to step 11 rather than smoothing over it in the prose.",
    },
    {
      step: 2,
      instruction:
        "Fix the audience lens before touching content. From the `audience` value, name the one decision question this report exists to answer (see the audience-specific guidance in step 10), and let that decision question — not the order the source tools happened to be called in — drive every choice from here forward.",
    },
    {
      step: 3,
      instruction:
        "Identify the single most decision-relevant finding across ALL completed_analyses combined, not just the first tool's summary. This is the fact that would most change the reader's next move — it may be a minor note buried inside one source's write-up (a food-safety mention inside a review-signal theme list) that outranks that same source's own headline finding. This becomes the verdict at the top of the ladder.",
    },
    {
      step: 4,
      instruction:
        "Build a contradiction ledger: compare claims across the different completed_analyses entries wherever two or more describe the same underlying fact (review count, rating, competitor roster, price point, operating status). Where they disagree, either reconcile with a stated reason (a more recent pull, a platform-specific count) or leave it explicitly flagged as unresolved — never silently pick whichever number reads better.",
    },
    {
      step: 5,
      instruction:
        "Cluster the individual findings from every input into 3-6 cross-cutting themes, not a per-tool section list. A theme like 'front-of-house consistency' might combine a review_intelligence pattern, a business_teardown recommendation, and a competitor_landscape gap — merge these into one synthesized paragraph, not three paragraphs stacked under three tool headers.",
      guidance: "If a theme only exists in one source and doesn't connect to anything else, that's fine — it just means fewer sources merged into it, not that it belongs in its own tool-labeled section.",
    },
    {
      step: 6,
      instruction:
        "Rank the themes using the audience-specific weighting from step 10 (fixability x urgency / effort for an owner; valuation and risk impact for a broker or buyer; growth-thesis relevance for an investor; plain decision-importance for general) — never rank by which tool happened to surface the theme first.",
    },
    {
      step: 7,
      instruction:
        "Lay out section order per the Verdict Ladder: verdict/executive summary, then prioritized findings highest-first, then supporting detail, then the evidence appendix, then caveats. Do not bury the top finding in a later section for narrative build-up — a business reader deciding what to do next does not read that way.",
    },
    {
      step: 8,
      instruction:
        "Write the executive summary LAST, after the rest of the document is drafted, by pulling only from sentences that already exist in the body. Never draft it from memory of the raw completed_analyses text — that is how a summary drifts from what the assembled report actually supports.",
      guidance: "If a sentence you want in the executive summary doesn't yet appear, cited, somewhere in the body, that's a sign it doesn't belong in the summary yet — add it to the body first, or drop it.",
    },
    {
      step: 9,
      instruction:
        "Enforce citation discipline throughout: every claim in prioritized_findings and the executive summary carries an inline source tag back to the completed_analyses entry it came from. Cut any claim that no entry actually supports rather than filling the gap from outside knowledge — this tool assembles what was fed in, it does not add new research.",
    },
    {
      step: 10,
      instruction:
        "Apply audience-specific framing — the same underlying findings should read as a genuinely different document per value of `audience`, not one generic paragraph with the audience name swapped in:\n" +
        "- owner: lead with fixable operational issues in plain, jargon-free language. Rank by (fixability x urgency) / effort, except a genuine safety/closure-risk finding always leads regardless of its fix cost. Cut or shrink anything the owner has no lever to pull (macro market growth, category-wide multiples) — this is an action list, not a market thesis.\n" +
        "- broker: lead with valuation-relevant risk and SDE framing. Position findings inside a comp/multiple context only if a source analysis actually supplied one (never invent a multiple at assembly time). Emphasize what would surface in a buyer's diligence questions — owner-dependency, customer-concentration proxies, cross-channel inconsistencies, review-velocity red flags. Cut granular how-to-fix detail beyond what's needed to characterize the risk.\n" +
        "- buyer: similar material to broker, opposite stance — lead with findings that should change the offer, terms, or walk-away decision, and questions to put to the seller before committing capital. More willing than a broker report to state a finding is disqualifying. Emphasize downside risk and post-close fix cost, because the buyer's decision is price/terms, not how to market a listing.\n" +
        "- investor: lead with market opportunity and a growth thesis — sector tailwinds/headwinds and this business's position to capture or miss them. Frame negative operational findings as unclaimed upside ('the review-response gap is low-cost, uncaptured upside,' not 'reviews are bad') even when the underlying evidence is identical to the owner report. Cut deep prescriptive how-to-fix detail; keep the opportunity thread front and center.\n" +
        "- general: assume no reader self-interest. Lead with the single most objectively important finding in balanced, neutral tone — neither fix-it-for-me, nor valuation, nor growth-thesis framing. Use this only when the actual reader relationship to the business hasn't been confirmed; don't guess a narrower audience than what was declared.",
    },
    {
      step: 11,
      instruction:
        "State coverage gaps explicitly: if completed_analyses is thin (only one or two tools run) or a domain highly relevant to this audience was never called (e.g. no broker_diligence_prep entry in a broker-audience report), say so in the report rather than presenting partial coverage with the same confidence as a full multi-tool session.",
    },
    {
      step: 12,
      instruction:
        "Final read-through: confirm section order matches priority rank (not tool-call order), confirm no theme is restated under two different headings, and confirm every number in the executive summary also appears, cited, in the body.",
    },
  ],
  output_schema: {
    report_title: "string — business name plus a report label worded for the audience (e.g. 'Fix-It Priorities: <business>' for owner; 'Diligence Brief: <business>' for broker/buyer; 'Growth Thesis: <business>' for investor).",
    executive_summary:
      "2-5 sentences, written LAST per research_procedure step 8. States the verdict and the top 1-3 priority findings in the audience's own decision frame. Every sentence must trace to a specific, cited claim in the body — no information introduced here for the first time.",
    contradiction_ledger:
      "array of { fact, source_a: { tool, claim }, source_b: { tool, claim }, resolution: 'reconciled' | 'flagged_unresolved', note } — empty array if no two completed_analyses entries described an overlapping fact differently.",
    prioritized_findings:
      "array of { rank, theme, synthesis: '2-4 sentences merging every completed_analyses input that touched this theme, not restated one source at a time', supporting_evidence: array of { source_tool, evidence }, priority_rationale: 'why this rank, under this audience's specific weighting from step 10' }, ordered highest-priority first.",
    supporting_detail:
      "array of { theme, detail } — real, cited material that didn't clear the bar for prioritized_findings; kept so nothing verified is silently dropped, just demoted below the fold.",
    evidence_appendix: {
      sources_used: "array of { tool, one_line_scope } — which completed_analyses entries were drawn on and for what.",
      sources_missing: "array of tool names absent from completed_analyses that would have materially strengthened this report for this specific audience — stated plainly, not implied.",
      citation_index: "array of { claim, source_tool } covering every claim used in executive_summary and prioritized_findings — the traceability backbone a skeptical reader could audit.",
    },
    audience_framing_notes: {
      applied_audience: "the exact `audience` enum value used for this assembly.",
      lead_with: "what this audience's version opens on, per the step-10 guidance for that specific enum value.",
      tone: "'plain-operational' (owner) | 'valuation-risk-analytical' (broker/buyer) | 'growth-thesis-market' (investor) | 'balanced-neutral' (general).",
      cut_or_deemphasized: "what was demoted or cut specifically because of the chosen audience, and why.",
    },
    caveats_and_gaps: "array of strings — caveats inherited from the underlying source analyses that still apply, plus any coverage gap surfaced in research_procedure step 11.",
  },
  quality_rubric: {
    good_looks_like: [
      "Every claim in the executive summary is traceable to a specific completed_analyses entry and appears, cited, in the body — not invented at synthesis time.",
      "Findings are synthesized into cross-cutting themes, not restated one source at a time under per-tool headings.",
      "The single highest-priority finding leads the document regardless of which tool produced it or when it was called.",
      "A contradiction between two completed_analyses entries is surfaced and either reconciled with a stated reason or explicitly flagged as unresolved — never silently resolved by picking whichever number sounds better.",
      "Audience framing is substantively different across the five values — an owner version and an investor version of the same underlying findings read as different documents, not the same paragraphs with a swapped header.",
      "Gaps in input coverage (a tool never run, a thin write-up) are stated plainly rather than papered over with confident-sounding prose.",
      "The assembled report reads as one coherent narrative voice, not a stitched sequence of five separate tools' outputs pasted end to end.",
      "Nothing in the report claims research the assembler doesn't actually have — this tool reorganizes and synthesizes completed_analyses, it does not add new findings.",
    ],
    common_failure_modes: [
      "Restating each source analysis's findings in sequence ('business_teardown found X, then review_intelligence found Y') instead of synthesizing them into one narrative.",
      "Burying the most important finding in section three or four for narrative build-up instead of leading with it.",
      "Writing the executive summary first, or from memory of the raw tool outputs, so it drifts from what the assembled body actually supports.",
      "Picking one number when two completed_analyses entries disagree, without surfacing the discrepancy anywhere in the report.",
      "Generic 'adjust tone for the audience' language that swaps the audience's name into an otherwise identical paragraph, instead of genuinely different emphasis and cuts per audience.",
      "Introducing a claim, statistic, or recommendation that traces back to no completed_analyses entry — treating assembly as an opportunity to add new analysis.",
      "Presenting a report built from one or two thin inputs with the same completeness and confidence as one built from a full multi-tool session, with no gap noted.",
      "Duplicating the same theme under two different section headings because it appeared inside two different source tools' summaries, instead of merging it once.",
    ],
  },
  caveats: [
    "This tool cannot improve or verify the underlying analyses it assembles — a thin, unevidenced, or wrong completed_analyses entry produces a thin, unevidenced, or wrong section in the finished report. Assembly exposes a source-quality gap; it can't close it.",
    "There is no access here to the original web research behind each completed_analyses summary, only the text handed in. If a source write-up omitted its own citations, the assembled report inherits that same uncitable claim.",
    "Audience selection is taken as given. If the wrong `audience` value was chosen (e.g. an investor framing for someone who is actually the sole owner), the report will be shaped wrong no matter how well the assembly itself is executed — confirm audience before running this, don't infer it from business type.",
    "The contradiction ledger can only catch disagreements that are recognizable as describing the same fact. Two sources using different terminology for the same underlying figure, without enough shared context to connect them, can slip through undetected.",
    "This framework assumes each completed_analyses entry is a genuine finished write-up, per that field's own description — if a raw framework payload gets pasted in instead of an executed analysis, assembly will synthesize methodology text as if it were findings, producing a nonsensical report.",
  ],
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
