import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";
import { BLS_METRO_ACCESS, BLS_PRICE_CAVEATS } from "./federal_sources.js";

const InputSchema = z.object({
  business_name: z.string().describe("The business's name as it appears on its own signage/website, not a guess."),
  city_metro: z.string().describe("City + state/region, e.g. 'Saint Paul, MN' — narrows the trade area and comp set."),
  category: z
    .string()
    .optional()
    .describe(
      "Category if known (e.g. 'nail salon', 'brewery taproom'). If omitted, step 2 of the procedure confirms it — don't guess from the name alone.",
    ),
});

const PAYLOAD: FrameworkPayload = {
  tool: "business_teardown",
  framework:
    "Four-quadrant teardown — Presence (can they be found), Perception (what do people say), Position (how do they compare), Performance signals (what public proxies suggest about trajectory). Score each quadrant independently BEFORE synthesizing recommendations, so one bad quadrant doesn't get laundered into a falsely negative (or falsely positive) overall verdict, and a strong quadrant doesn't paper over a weak one.",
  research_procedure: [
    {
      step: 1,
      instruction:
        "Confirm identity and current operating status. Verify the exact address, phone, and hours via the business's Google Business Profile, and confirm it is not marked 'permanently closed' or 'temporarily closed.' If status is ambiguous, find one corroborating mention (a review, a social post, a news item) within roughly the last 60 days.",
      guidance:
        "If the business reads as closed or the identity is ambiguous (e.g. two businesses share a near-identical name in the same metro), that IS the finding — stop and report it as the headline issue rather than tearing down the wrong entity or a dead listing.",
    },
    {
      step: 2,
      instruction:
        "Establish the business's true category from its own website, menu, or service list — not just the category Google Maps auto-assigned, which is frequently wrong or too broad (a 'cafe' that's actually a full breakfast restaurant; a 'spa' that's actually a single-room massage practice).",
      guidance: "This category determines who counts as a real competitor in step 7 — get it wrong and the whole competitive read is wrong.",
    },
    {
      step: 3,
      instruction:
        "Map the full digital footprint: website, Google Business Profile, Instagram, Facebook, Yelp, TripAdvisor, and sector-specific platforms (OpenTable/Resy for restaurants, Booksy/StyleSeat for salons, Untappd for breweries, etc.). For each channel found, note whether it exists, its last-active/last-post date, and whether it's missing entirely.",
    },
    {
      step: 4,
      instruction:
        "If a website exists, audit it directly: mobile-friendliness, whether hours/menu/pricing match the Google Business Profile, whether there's a clear call to action (book, order, call), and whether contact info is consistent with every other channel found in step 3.",
      guidance: "Inconsistent hours or a stale menu across channels is a concrete, citable finding — 'website says X, GBP says Y' beats a vague 'the website feels outdated.'",
    },
    {
      step: 5,
      instruction:
        "Pull review data across platforms, not just Google: total count, average rating, review velocity (reviews per month, trailing 12 months vs. the 12 before that), and the date of the most recent review. Read at least 20-30 of the most recent reviews plus a sample of the lowest-rated ones.",
    },
    {
      step: 6,
      instruction:
        "Decode review sentiment into named, repeated themes — not a single sentiment score. Group specific complaints and compliments into categories (e.g. 'wait times,' 'front-desk turnover,' 'value for price') with an approximate frequency for each, and pull 2-3 verbatim quotes per theme.",
      guidance: "One outlier review is not a theme. A theme needs to recur across multiple reviewers to be reported as a pattern.",
    },
    {
      step: 7,
      instruction:
        "Identify 3-5 true local competitors: same category (per step 2), same realistic trade area, comparable price point where knowable. Exclude a different location of the same brand/franchise unless a franchise-internal comparison is the explicit point. For each competitor, capture rating, review count, and one clear differentiator.",
    },
    {
      step: 8,
      instruction:
        "Build a positioning read: where does the subject business sit against those competitors on price and on the review themes from step 6? Is it winning on quality but losing on visibility, or the reverse?",
    },
    {
      step: 9,
      instruction:
        "Read pricing signals: published menu/price list if available, review mentions of price ('expensive,' 'worth it,' 'overpriced'), and how that lands relative to the competitive set from step 7.",
    },
    {
      step: 10,
      instruction:
        "Check visibility mechanics: map-pack presence for the 2-3 most obvious category+city searches a customer would actually type, Google Business Profile completeness (categories, attributes, Q&A answered, posts active in the last 90 days), and NAP (name/address/phone) consistency across every channel found in step 3.",
    },
    {
      step: 11,
      instruction:
        "Look for a foot-traffic or demand proxy — Google's Popular Times graph, the review-velocity trend from step 5, or a booking platform's visible availability pattern — and weight it explicitly as a soft, indirect signal, never as a hard metric.",
    },
    {
      step: 12,
      instruction:
        "Synthesize steps 1-11 into the four-quadrant scorecard (Presence / Perception / Position / Performance signals), scoring each quadrant independently before forming an overall read.",
    },
    {
      step: 13,
      instruction:
        "Prioritize recommendations by (evidence strength x likely impact) / effort. Every recommendation must cite the specific evidence from steps 1-11 that motivated it — never issue a recommendation with no citation behind it.",
    },
    {
      step: 14,
      instruction:
        "Before any recommendation that costs the owner money — raise prices, hire, extend hours — establish what this metro actually pays and what category prices have done, from federal series rather than from national impressions. " +
        BLS_METRO_ACCESS,
      guidance:
        "The two recommendations most often issued blind are 'raise your prices' and 'add staff.' Both depend on local numbers the review corpus cannot see: a metro whose average private hourly earnings run well above the regional norm has a different staffing math than one that does not, and a price rise that merely matches category inflation is not a real increase. Quote the metro figure with its period, and if BLS publishes no local CPI say plainly that the price figure is regional.",
    },
  ],
  output_schema: {
    exec_summary: "2-4 sentences: the single most important thing true about this business right now, stated plainly.",
    identity_confirmation: {
      verified_name: "string",
      address: "string",
      operating_status: "'open' | 'temporarily_closed' | 'permanently_closed' | 'ambiguous'",
      status_evidence: "what corroborated the status (step 1)",
    },
    digital_footprint: {
      channels: "array of { platform, exists: boolean, last_active_date_or_null, notes }",
    },
    review_signal: {
      platforms: "array of { platform, rating, review_count, velocity_trend }",
      themes: "array of { theme, frequency_estimate, sample_quotes: string[2-3], sentiment: 'positive'|'negative'|'mixed' }",
    },
    competitive_set: "array of { name, rating, review_count, price_point_estimate, differentiator }",
    positioning_summary: "1-2 paragraphs synthesizing step 8",
    pricing_posture: "string — where this business sits vs. the comp set on price, with evidence",
    visibility_scorecard: {
      map_pack_presence: "per the 2-3 searches checked in step 10",
      gbp_completeness: "string",
      nap_consistency: "'consistent' | 'inconsistent', with specifics",
    },
    performance_proxies: "string — foot-traffic/demand proxy read, explicitly labeled as soft signal",
    quadrant_scores: {
      presence: "1-5 with one-line justification",
      perception: "1-5 with one-line justification",
      position: "1-5 with one-line justification",
      performance_signals: "1-5 with one-line justification",
    },
    recommendations: "array of { priority_rank, recommendation, evidence_citation, estimated_effort: 'low'|'medium'|'high', estimated_impact: 'low'|'medium'|'high' }, ordered highest priority first",
  },
  quality_rubric: {
    good_looks_like: [
      "Every claim traces to a specific, citable piece of evidence (a review quote, a listed price, a missing channel) — not a vibe.",
      "Review themes are named and counted, not summarized as a single sentiment adjective like 'mostly positive.'",
      "The competitive set is genuinely local and genuinely comparable — not the first five results for the category regardless of distance or price tier.",
      "Recommendations are ranked and each ties back to the exact evidence that motivated it.",
      "Uncertainty is stated plainly ('review count is too low to call this a trend' rather than presenting a 3-review sample as a pattern).",
      "The operating-status check in step 1 actually happened and is reported, even when the answer is just 'confirmed open.'",
    ],
    common_failure_modes: [
      "Treating the star rating as ground truth about quality rather than as one noisy, self-selected signal among several.",
      "Ignoring review recency — quoting a glowing 2019 review to describe a business whose last 20 reviews are all critical (or the reverse).",
      "Confusing a foot-traffic proxy (Popular Times, review velocity) with actual revenue or profitability, which no public signal reveals.",
      "Citing a different location of the same franchise/brand as a 'competitor.'",
      "Treating Google Maps' auto-assigned category as authoritative instead of checking what the business actually sells.",
      "Stapling a fabricated or unsourced dollar figure onto a finding to make it sound more rigorous than the evidence supports.",
      "Presenting a single scathing (or single glowing) review as representative of overall sentiment.",
      "Recommending generic best-practices ('post more on social media') with no evidence this business specifically needs it.",
      "Skipping the operating-status check and tearing down a business that's already closed.",
    ],
  },
  caveats: [
    "Public review platforms skew toward extreme experiences — very good or very bad — not the typical customer visit. Read them as a signal about specific, repeated patterns, not as a representative survey.",
    "No public signal reveals a business's actual revenue, margin, or financial health. Foot-traffic and review-velocity proxies are directional at best — say so explicitly rather than implying financial diligence.",
    "Google's Popular Times data is itself modeled from historical aggregated signals and can be stale or wrong for a recently reopened, newly opened, or highly seasonal business.",
    "A franchise or multi-location brand's review corpus may blend sentiment about a different location — verify quotes are about the specific location in scope wherever the platform allows it.",
    "If web search access returns thin, stale, or contradictory results, report that limitation explicitly instead of presenting a low-confidence read as settled fact.",
    ...BLS_PRICE_CAVEATS,
  ],
};

export function registerBusinessTeardown(server: McpServer, env: Env): void {
  server.registerTool(
    "business_teardown",
    {
      title: "Business Teardown",
      description:
        "Full structured teardown of ONE named small business: digital presence, review signal, competitive position, pricing posture, visibility gaps, and prioritized, evidence-cited recommendations. The flagship tool — start here for any single-business question.\n\n" +
        "Example invocations:\n" +
        '- "Run a teardown of Mucci\'s Italian in Saint Paul, MN"\n' +
        '- "Tear down The Gray Duck Tavern (bar) in Minneapolis and tell me what\'s actually broken"\n' +
        '- "I\'m thinking about buying Sunrise Nails in Denver, CO — give me a teardown before I look deeper"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Business Teardown", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    withPolicy("business_teardown", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
