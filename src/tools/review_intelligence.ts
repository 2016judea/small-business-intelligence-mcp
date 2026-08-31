import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";
import { REVIEW_PLATFORM_ACCESS, REVIEW_TRAPS } from "./sources.js";

const InputSchema = z.object({
  business_name: z.string().describe("The business's name as it appears on its own signage/website."),
  city_metro: z.string().describe("City + state/region, e.g. 'Wichita, KS' — disambiguates same-named businesses."),
  category: z.string().optional().describe("Category if known — helps set expectations for review volume/velocity norms."),
});

const PAYLOAD: FrameworkPayload = {
  tool: "review_intelligence",
  framework:
    "Review Stratigraphy — read the corpus in independent layers (classification, pattern, trajectory, differentiation, risk) the way a geologist reads rock strata, before drawing any conclusion about the business as a whole. Each layer is scored/tallied on its own terms first. Skipping straight to a synthesized impression is how a single bad month gets mistaken for a chronic condition, a chronic condition gets buried under a flattering lifetime average, or a genuine differentiator gets waved off as generic praise because nobody counted how often it actually recurs.",
  research_procedure: [
    {
      step: 1,
      instruction:
        "Inventory every platform carrying a review corpus for this business — Google, Yelp, Facebook, TripAdvisor, and the sector-specific platform if one exists (OpenTable/Resy for restaurants, Booksy/StyleSeat for salons, Untappd for breweries). For each, record total review count and the date range covered.",
      guidance:
        "Google's default view often surfaces a 'most relevant' sort, not 'newest' — switch to newest explicitly, or the chronological work in steps 3 and 8 will be built on a helpfulness-ranked sample instead of a time-ordered one. " +
        "IF YOU ARE PULLING PROGRAMMATICALLY RATHER THAN READING THE PAGE, establish your ceiling before designing the analysis. " +
        REVIEW_PLATFORM_ACCESS,
    },
    {
      step: 2,
      instruction:
        "Pull a deliberately stratified reading sample: the most recent 20-30 reviews AND a comparably sized sample from roughly 12-24 months back, not just whatever loads by default.",
      guidance:
        "If total review count is under ~25, say so explicitly and scale back trajectory claims accordingly — splitting 12 reviews into a 'recent window' and a 'prior window' produces a coin-flip, not a trend.",
    },
    {
      step: 3,
      instruction:
        "Read every review in the working sample in full, not just the star rating and first line. For each 1-3 star review, extract every discrete complaint as its own tagged excerpt (reviewer date, platform, verbatim text) — a review that levels three separate complaints yields three excerpts, not one.",
    },
    {
      step: 4,
      instruction:
        "Classify each complaint excerpt into a fixed taxonomy: wait time/service speed, staff turnover/inconsistency, price-value mismatch, cleanliness/upkeep, order or booking accuracy, communication/responsiveness, parking/access, product/food quality, and a catch-all 'other' for anything genuinely outside those eight. Assign one primary category per excerpt; allow a secondary tag when an excerpt genuinely spans two.",
      guidance:
        "Resist inventing a bespoke category for every excerpt — the taxonomy's value is comparability across businesses. Only add a category outside the fixed eight when a distinct complaint type recurs at least 3 times and doesn't fit any of them.",
    },
    {
      step: 5,
      instruction:
        "Tally frequency per category as real counts against the sample, e.g. '9 of 41 reviews sampled mention wait time (22%).' Never launder 'a couple' or 'several' into an implied size you didn't count.",
      guidance:
        "State counts against the sample you actually read, not the full platform total — 'of the 41 reviews sampled,' never 'of all reviews,' unless the sample and the corpus are the same size.",
    },
    {
      step: 6,
      instruction:
        "Promote a complaint category to a named 'theme' only when it recurs across at least 3 independent reviewers — not 3 mentions from one reviewer posting to multiple platforms. Reject vivid singleton complaints even when they're colorful.",
      guidance:
        "Deduplicate by cross-referencing reviewer names/handles across platforms before counting independence — the same disgruntled customer posting to Google and Yelp is one data point, not two.",
    },
    {
      step: 7,
      instruction:
        "For each promoted theme, pull 2-3 verbatim quotes spanning different reviewers and, where possible, different time periods — proof the theme isn't one bad week concentrated in a single cluster of dates.",
    },
    {
      step: 8,
      instruction:
        "Split the corpus chronologically — most recent ~90 days or most recent ~15-20 reviews, whichever is the larger set, versus everything older — and independently re-run the taxonomy tally from steps 4-5 on each window. Compare which categories intensified, faded, appeared new, or resolved between the two.",
      guidance:
        "This is the highest-value step in the tool. A business with a strong lifetime average but a cratering recent window (or the reverse — visibly recovering under new management) is a materially different finding than a flat lifetime average, and the lifetime number alone will hide it. Do not let a good all-time rating launder a live inflection point, and do not let one bad quarter overwrite years of a strong track record without saying so.",
    },
    {
      step: 9,
      instruction:
        "Check for review-authenticity anomalies: any month with an unusually high review count relative to the surrounding trend, an unusually uniform rating within that spike, or a cluster of short/generic-text reviews landing in a tight date window — flag as a possible incentivized/gated/purchased-review pattern, not a confirmed one. Separately, characterize the owner's response pattern (present vs. absent, templated vs. specific, defensive vs. accountable).",
    },
    {
      step: 10,
      instruction:
        "Mine 4-5 star reviews specifically for spontaneous, NAMED praise — a specific dish, a staff member's first name repeated across independent reviewers, a specific policy (e.g. 'they text you when it's ready'), a specific outcome — and discard generic praise ('great service,' 'friendly staff,' 'highly recommend') that carries no distinguishing information.",
      guidance:
        "Before calling a named praise item a differentiator, sanity-check it against general knowledge of the category: is this something businesses in this category typically get credit for anyway (e.g. 'friendly staff' at a coffee shop), or is it something this business's reviewers cite that peers in the category usually don't earn credit for? If unsure, flag the uncertainty rather than asserting differentiation — a full competitive comparison belongs to competitor_landscape, not this tool.",
    },
    {
      step: 11,
      instruction:
        "Run the buyer red-flag pass: scan the full sample specifically for staffing/ownership-transition language ('new owners,' 'since they sold,' 'management changed,' 'new GM,' 'not the same since'), health/safety-adjacent mentions (illness, pests, visible uncleanliness, code-adjacent language), and refund/dispute mentions. Tag each hit with its date and platform.",
    },
    {
      step: 12,
      instruction:
        "Check specifically for a rating cliff: bucket ratings by quarter (roughly) across the full available date range and flag any quarter where the average or the review velocity breaks meaningfully from the trailing pattern. Where the reviews themselves name a cause (ownership change, renovation, a specific staff departure), tie the cliff to that event; where they don't, report the cliff as unexplained rather than inventing a cause.",
    },
    {
      step: 13,
      instruction:
        "If a price-value theme was promoted in step 6, cross-reference it in one line for the buyer-risk read — but do not expand into a full pricing-tier or competitive-pricing analysis; that scope belongs to pricing_benchmark.",
    },
    {
      step: 14,
      instruction:
        "Synthesize steps 1-13 into the deliverable and close with a 2-4 sentence trajectory verdict — improving, stable, declining, or insufficient-data — stated plainly with the specific evidence (which window, which categories, which quotes) that drove the call.",
    },
  ],
  output_schema: {
    exec_summary: "2-4 sentences: the single most important thing the review corpus reveals right now, stated plainly.",
    corpus_scope: {
      platforms: "array of { platform, review_count, oldest_review_date, newest_review_date, sample_read_count, sample_method }",
      sample_size_caveat: "string — explicit note if any platform's corpus was too thin (<25) for trajectory work",
    },
    complaint_taxonomy: {
      categories:
        "array of { category_name, excerpt_count, review_count, pct_of_sample, sample_excerpts: array of { quote, reviewer_date, platform } (2-3 per category) }, fixed 8-category taxonomy plus any justified 'other' additions",
    },
    promoted_themes:
      "array of { theme, category_ref, independent_reviewer_count, verbatim_quotes: array of { quote, date, platform }, sentiment: 'negative'|'positive'|'mixed', trend: 'intensifying'|'stable'|'fading'|'new_since_recent_window'|'resolved' }",
    sentiment_trajectory: {
      recent_window: "{ window_definition, review_count, avg_rating_or_estimate, dominant_categories }",
      prior_window: "{ window_definition, review_count, avg_rating_or_estimate, dominant_categories }",
      category_deltas: "array of { category, recent_window_share, prior_window_share, direction: 'up'|'down'|'flat'|'new'|'resolved' }",
      verdict: "'improving' | 'stable' | 'declining' | 'insufficient_data'",
      verdict_evidence: "string — the specific windows/categories/quotes that drove the verdict",
    },
    review_authenticity_check: {
      velocity_anomalies: "array of { window, description, suspicion_level: 'low'|'medium'|'high' }, empty array if none found — explicitly state that the check ran",
      owner_response_pattern: "string — present/absent, templated vs. specific, defensive vs. accountable, with one example",
    },
    differentiators:
      "array of { differentiator, frequency_estimate, independent_reviewer_count, sample_quotes: string[2-3], category_norm_context: string explaining why this isn't generic praise for the category }",
    buyer_red_flags: {
      staffing_ownership_signals: "array of { quote, date, platform }",
      health_safety_mentions: "array of { quote, date, platform }",
      refund_dispute_mentions: "array of { quote, date, platform }",
      rating_cliff: "{ detected: boolean, cliff_window, likely_cause_if_stated_by_reviewers, cause_confidence: 'stated'|'inferred'|'unexplained', evidence }",
      overall_risk_read: "string — plain-language synthesis of the above for someone evaluating this business as a buyer",
    },
    price_value_cross_reference: "string — one line only, if a price-value theme was promoted; otherwise 'no price-value theme met the promotion bar'",
    trajectory_verdict_summary: "2-4 sentences per step 14 — the closing read, evidence-cited",
  },
  quality_rubric: {
    good_looks_like: [
      "Every complaint category is reported as a real count against a stated sample size ('6 of 24 sampled reviews mention cleanliness') — never 'many,' 'several,' or 'a lot' standing alone.",
      "A theme required at least 3 independent reviewers before being named as a pattern, with cross-platform duplicates by the same reviewer collapsed to one data point.",
      "The trajectory read compares two explicit, dated windows (recent vs. prior) with per-category deltas — not a single lifetime average presented as the finding.",
      "Verbatim quotes carry a reviewer date and platform, not a paraphrase passed off as a quote.",
      "Differentiators are specific and named — a dish, a staff member's first name repeated by multiple reviewers, a concrete policy — never generic praise like 'great service' counted as a positioning asset.",
      "The review-authenticity check actually ran and is reported even when the answer is 'no anomalies found,' not silently skipped.",
      "Buyer red flags carry dates, so a reviewer's 2021 mention of an ownership change isn't presented as a live, current risk.",
      "A rating cliff, if found, is either tied to a reviewer-stated cause or explicitly labeled unexplained — never assigned an invented cause to sound more conclusive.",
    ],
    common_failure_modes: [
      "Reporting the lifetime star average as the headline finding and missing a live improving or declining inflection sitting in the last 90 days.",
      "Calling something a 'theme' off one vivid one-star review because it was quotable, without checking for a second or third independent reviewer.",
      "Counting the same reviewer's complaint on Google and Yelp as two independent data points instead of one.",
      "Quoting a scathing review without checking whether a later review or an owner response shows the complaint was actually resolved.",
      "Treating '5-star reviews outnumber 1-star reviews' as differentiation, when the 5-star text is all generic and names nothing specific about the business.",
      "Skipping the rating-velocity/authenticity check because the overall numbers 'looked fine' at a glance, missing a cluster of near-identical reviews in a two-week window.",
      "Reporting a multi-year-old staffing or ownership mention as a current buyer risk without flagging its age.",
      "Inferring complaint categories from the star-rating distribution alone instead of actually reading the low-star review text.",
      "Drifting into full competitive benchmarking or a pricing-tier writeup inside this tool's output — that scope belongs to competitor_landscape and pricing_benchmark respectively.",
    ],
  },
  caveats: [
    "Review platforms skew toward extreme experiences — very good or very bad — written by customers motivated enough to post. The corpus is a self-selected sample, not a representative survey of every customer.",
    "Velocity or clustering anomalies are circumstantial evidence of review gating or incentivization, not proof — report them as a flagged suspicion with a stated confidence level, never as a confirmed finding.",
    "A visible, engaged owner response signals that management is paying attention, not that the underlying complaint was actually fixed — review text alone can't confirm resolution.",
    "Trajectory comparisons are unreliable on thin corpora — under roughly 25 total reviews, or under ~10 in either window, state that explicitly instead of forcing an improving/declining verdict the sample can't support.",
    "A reviewer's mention of 'new management' or 'new owners' is a lead worth flagging for the buyer to verify independently, not confirmation that an actual ownership or leadership change occurred.",
    "Short-text sentiment is imperfect — sarcasm, a 4-star review with a buried complaint, or translated text can mis-classify. When a classification is uncertain, quote the text directly in the output rather than asserting a sentiment label on top of it.",
    ...REVIEW_TRAPS,
  ],
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
        '- "Perfect Image Salon in Wichita has a 4.6 average — check whether that\'s stable or masking a bad last 90 days"\n' +
        '- "I\'m evaluating The Anchor Room (bar) in Saint Paul, MN as a buyer — what do the reviews show about staffing turnover or an ownership change that the rating alone doesn\'t?"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Review Intelligence", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    withPolicy("review_intelligence", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
