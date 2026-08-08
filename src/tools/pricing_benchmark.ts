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

const PAYLOAD: FrameworkPayload = {
  tool: "pricing_benchmark",
  framework:
    "The Comparability Ladder × Confidence Ladder ('CxC') model. Two independent ladders, scored for every price point before it goes anywhere near a comparison table. The Comparability Ladder measures how cleanly an offering maps onto a single, explicitly defined comparable unit (a time increment, a volume, a portion, or an itemized base-price-with-add-ons-stripped-out) — an offering that can't be normalized to that unit doesn't enter the numeric table, it goes into an explicit exclusions list instead of polluting the range with a forced estimate. The Confidence Ladder measures how each surviving price was sourced, ranked published price list > third-party booking/ordering platform > review-mentioned specific price > review-mentioned qualitative sentiment only — and every number in the final table carries its rung and its sample size, so a single review's '$45 for a fill' is never displayed with the same visual weight as five independently dated, confirmed prices. A pricing comparison that skips either ladder produces a table that looks precise and isn't.",
  research_procedure: [
    {
      step: 1,
      instruction:
        "Lock the category granularity and trade-area radius that define comp-set eligibility before finding a single competitor. State both explicitly: the category at the same level of specificity as the input (don't quietly widen 'nail salon' to include full day spas, or narrow 'full-service restaurant' to exclude a gastropub that competes for the same table), and a geography sized to how that category actually draws customers (a nail salon's real trade area is a few miles; a destination brewery taproom's can be metro-wide).",
      guidance:
        "Write the radius down as a number with a reason, not a vibe — 'Denver metro' means something different for a strip-mall salon than for a brewery people drive 40 minutes to visit.",
    },
    {
      step: 2,
      instruction:
        "Before pulling a single price, define the comparable unit for this category in one explicit sentence: decompose the named service/item into its atomic billable pieces and state exactly what 'one unit' means and what's included versus excluded from it (e.g. 'one unit = 5oz pour of a flagship-style beer, tip/tax excluded' or 'one unit = 30 minutes of hands-on massage time, room/table fee included, retail product upsells excluded').",
      guidance:
        "This is the single highest-leverage judgment call in the whole procedure — a sloppy unit definition means every downstream number is arithmetic built on sand. Prefer the smallest unit that's actually billed independently (per ounce, per minute) over a bundled package, unless the bundle itself is the explicit thing being compared.",
    },
    {
      step: 3,
      instruction:
        "Build the comp set: 4-8 true local competitors in the locked category and trade area from step 1. Reuse business_teardown's competitor-identification discipline if a specific subject business anchors this query — same category, same realistic geography, excluding a different location of the same brand/franchise unless that's the explicit point.",
    },
    {
      step: 4,
      instruction:
        "For each comp-set business, pull their most detailed available price list or service menu and read the actual line-item language, not just the price — note exactly what's included versus what's an add-on (e.g. one salon's 'gel manicure' includes a paraffin dip and hand massage; another's is polish-only with paraffin as a $12 add-on).",
      guidance:
        "The included-vs-add-on delta is usually buried in a footnote or an asterisk, and it's exactly what makes two '$45 gel manicures' not actually the same offering. Skipping this read is the most common way a normalized-looking table turns out to be comparing different things.",
    },
    {
      step: 5,
      instruction:
        "Convert each business's raw offering into the comparable unit from step 2 via explicit arithmetic, and show the math in the output (price per ounce = flight price ÷ total ounces poured; price per comparable minute = package price ÷ minutes of hands-on service, product value excluded).",
      guidance: "A bare converted number with no visible arithmetic is unauditable and indistinguishable from a guess — the division has to be legible in the final deliverable.",
    },
    {
      step: 6,
      instruction:
        "When an offering cannot be decomposed to the comparable unit with reasonable confidence (a chef's tasting menu with no fixed course count, a spa's fully custom facial with variable duration), do not force a conversion. Log it in an explicit exclusions list with the specific reason and drop it from the numeric table.",
      guidance:
        "This is where time pressure causes real damage — the tempting move is to estimate and move on. Excluding and stating why is the more rigorous choice, not a weaker one; a forced bad conversion is worse than a documented gap.",
    },
    {
      step: 7,
      instruction:
        "Run the source ladder per business, starting at the top rung: check the business's own published price list — official website, a printed menu photographed among its Google Business Profile photos, or a PDF menu hosted on a listing/aggregator site.",
      guidance: "A price list a customer photographed and that now lives in a business's Google Photos tab still counts as 'published' — check those, not only the official site's own pricing page.",
    },
    {
      step: 8,
      instruction:
        "If no published price exists, check third-party platforms that surface pricing: Booksy/StyleSeat/Vagaro/Mindbody for personal-care and studio services, OpenTable/Resy/Toast for restaurants, Untappd venue notes for breweries. Capture actual itemized prices where the platform shows them.",
      guidance:
        "Treat OpenTable/Resy's $–$$$$ symbols as a coarse relative-tier signal only, never as a table entry with its own price — it's a tie-breaker or a sanity check on the qualitative read, not a data point on the Confidence Ladder's numeric rungs.",
    },
    {
      step: 9,
      instruction:
        "If still nothing, search reviews for explicit dollar-figure mentions tied to a convertible item ('$45 for a fill,' 'the flight was $12 for six pours,' '$18 for the entree'). Capture the exact quote, an approximate review date, and only use it if it's specific enough to map cleanly onto the step 2 unit definition.",
      guidance:
        "A review that says '$150 for the full set' without saying what the full set included cannot be converted — treat it like step 6's exclusion rule rather than forcing it into the table.",
    },
    {
      step: 10,
      instruction:
        "If no specific price mention exists anywhere for a business, fall back to qualitative price sentiment mined from reviews ('expensive,' 'reasonable for the quality,' 'overpriced,' 'great value'). Count how many reviews express each sentiment and in which direction, and mark that business's row as qualitative-only — never blended numerically with businesses that have real price points.",
      guidance:
        "This is the last rung and the most misused. A business with only qualitative sentiment gets a sentence like 'reads as pricier than the comp set, per 4 review mentions of \"expensive\"' — never a manufactured dollar figure dressed up to look precise.",
    },
    {
      step: 11,
      instruction:
        "Tag every surviving price point with two explicit labels: its Confidence Ladder rung (published / platform / review-specific / review-qualitative-only) and its sample size (n=1 review mention vs. n=5 independently dated mentions vs. one authoritative published list).",
      guidance:
        "Don't round these away in the final table. A $45 price from one review and a $45 price confirmed on both the website and two reviews render as the same digits but are not the same fact.",
    },
    {
      step: 12,
      instruction:
        "Check recency and structural parity across the surviving price points: flag anything sourced from a menu or mention older than roughly 12 months as potentially stale (say so plainly if a menu is undated rather than implying it's current), and check whether tax, an auto-included service charge, or an expected-but-unlisted gratuity is baked into some businesses' listed prices and not others'.",
      guidance:
        "A published price with no auto-gratuity compared blind against a competitor whose menu price already bakes in a 20% service charge is a normalization failure just as real as a bundle mismatch from step 4 — check for it explicitly rather than assuming uniform pricing conventions across the comp set.",
    },
    {
      step: 13,
      instruction:
        "Assemble the comparison table and compute the range (and, if a specific subject business anchors the query, its position within that range), weighting the central tendency toward the higher-confidence tiers. State plainly how many of the N comp-set businesses contributed real numeric data versus qualitative-only signal.",
    },
    {
      step: 14,
      instruction:
        "Sanity-check outliers before finalizing: any converted price that sits far outside the rest of the range should be re-examined for a normalization miss (a wrong unit conversion, a missed add-on, a stale price) before being reported as a genuine market outlier. Only call it a real outlier once the unit definition has been re-verified specifically for that business.",
    },
  ],
  output_schema: {
    exec_summary: "2-4 sentences: what the pricing picture actually says for this category/metro, stated plainly, with an explicit confidence caveat if the comp set leans qualitative-only.",
    comparable_unit_definition: {
      category: "string — the locked category from step 1",
      unit_definition: "one precise sentence, e.g. 'one unit = 30 minutes hands-on massage time, room/table fee included, product upsells excluded'",
      included_in_unit: "string[]",
      explicitly_excluded_from_unit: "string[] — add-ons, upsells, materials stripped out before comparison",
      rationale: "why this unit was chosen over the alternative bundling",
    },
    comp_set_scope: {
      category_used: "string",
      trade_area_definition: "string — radius/geography and the reasoning from step 1",
      businesses_considered: "array of { name, included: boolean, reason_if_excluded }",
    },
    price_table: {
      description: "one row per comp-set business that survived normalization",
      rows: [
        {
          business_name: "string",
          raw_offering_as_published: "string — what they actually list/sell, verbatim where possible",
          unit_conversion_math: "string showing the arithmetic, e.g. '$28 flight ÷ 20oz = $1.40/oz'",
          converted_price_per_unit: "number or string",
          source_tier: "'published' | 'platform' | 'review_specific' | 'review_qualitative_only'",
          sample_size: "string, e.g. 'n=1 published list' | 'n=3 review mentions, dated'",
          price_date_or_estimate: "string — observed/published date, or 'undated' if unknown",
          staleness_flag: "boolean",
          tax_service_parity_note: "string — whether tax/service/gratuity is baked in, and whether that's consistent with the rest of the comp set",
        },
      ],
    },
    non_comparable_exclusions: "array of { business_name, offering, reason_not_convertible } — offerings dropped per step 6, never force-converted",
    qualitative_only_signals: "array of { business_name, sentiment_direction: 'cheap'|'reasonable'|'expensive'|'mixed', mention_count, sample_quotes: string[] }",
    comparison_summary: {
      numeric_range: "low-high across converted comparable-unit prices, plus how many of the N comp-set businesses contributed a numeric price",
      central_tendency: "string — median or weighted center, with the weighting-toward-higher-confidence-tiers method stated",
      subject_business_position: "string — where the subject business (if one anchors the query) falls in the range; null/omitted for a category-wide scan with no single subject",
      confidence_overall: "'high' | 'medium' | 'low' — driven explicitly by what fraction of the comp set reached published/platform tier vs. qualitative-only",
    },
    outlier_notes: "array of { business_name, flagged_reason, resolution: 're-verified as a real outlier' | 're-classified after a unit-conversion correction' }",
    narrative_synthesis: "2-4 sentences synthesizing the table into a plain-language read of where prices sit and how confident that read actually is",
  },
  quality_rubric: {
    good_looks_like: [
      "The comparable-unit definition is written down as one explicit sentence before a single price is pulled — never reverse-engineered afterward to justify whatever numbers were easiest to find.",
      "Every converted price in the table shows its arithmetic (X ÷ Y = Z), not just a bare final number.",
      "A business whose offering can't be normalized is excluded and logged with a specific reason, never force-converted with a shaky estimate.",
      "Source tier and sample size are visible on every row of the final table, and a single-review price is never rendered with the same visual confidence as a published, multiply-confirmed one.",
      "Qualitative-only sentiment is reported as qualitative — 'reads as pricier than the comp set, per 4 review mentions of \"expensive\"' — never converted into a manufactured dollar figure.",
      "Stale prices (a menu photo more than ~12 months old, an undated PDF) are flagged as such, not presented as current.",
      "Tax/service-charge/gratuity parity is checked explicitly whenever it plausibly differs across the comp set, not assumed uniform.",
      "Outliers are re-examined for a unit-conversion mistake before being reported as a genuine market outlier.",
      "The overall confidence read (high/medium/low) is driven honestly by what fraction of the comp set reached hard numeric data, not asserted independent of the sourcing mix.",
    ],
    common_failure_modes: [
      "Comparing sticker prices across two businesses whose bundles include different things (a paraffin dip, an extra ounce, a bigger portion) as if the raw numbers were already apples-to-apples.",
      "Treating a single review's price mention as equivalent evidence to a published menu price, with no visible distinction in the final table.",
      "Manufacturing a specific dollar estimate from qualitative sentiment ('reviews call it expensive, so probably ~15% above the median') and presenting it as if it were a real data point.",
      "Skipping the exclusion step and force-converting a genuinely non-comparable offering — a tasting menu with no fixed course count, a fully custom facial — into a per-unit number anyway.",
      "Citing OpenTable/Resy's $–$$$$ tier symbols as if they were an actual price, rather than the coarse relative signal they actually are.",
      "Ignoring price date — quoting an old menu screenshot as current pricing in a market that's had real inflation since.",
      "Blending numeric and qualitative-only businesses into a single 'average price' without disclosing how many of the inputs were actually numbers.",
      "Widening or narrowing the trade-area radius opportunistically to include or exclude one specific competitor, rather than applying one consistent, category-appropriate radius across the whole comp set.",
      "Reporting a raw price range with no confidence tier attached at all, so a reader can't tell a rock-solid comparison from a mostly-qualitative guess.",
    ],
  },
  caveats: [
    "Most small businesses, especially in personal-care and full-service-restaurant categories, don't publish complete price lists online — a category-wide table will often lean on platform indicators and review mentions rather than menus, and should say so plainly instead of implying menu-level precision it doesn't have.",
    "Bundle composition drifts over time (a salon adds or drops a paraffin dip, a brewery changes its flight pour count) faster than cached menu pages or old review text update — a unit definition or price pulled from a stale source can describe an offering that no longer exists in that form.",
    "Review-mentioned prices are self-selected toward the moment someone felt strongly enough to mention the price at all — usually because it felt notably high or notably like a deal — which biases review-sourced price data away from the true typical price.",
    "A cleanly converted per-unit price strips out real differences in ambiance, service level, and overhead that can legitimately justify a price gap even when the underlying unit is identical — a 5oz pour at a destination taproom and a 5oz pour at a strip-mall taproom are the same comparable unit and a legitimately different price.",
    "Public pricing signal shows list price, not effective price — it can't see happy-hour windows, loyalty discounts, first-time-customer promos, or negotiated pricing, any of which can materially change what a typical customer actually pays.",
    "A thin comp set (fewer than roughly four businesses with real numeric data) should be reported as a low-confidence read regardless of how clean the individual unit conversions look — a well-normalized two-business comparison should never be presented with market-level certainty.",
  ],
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
