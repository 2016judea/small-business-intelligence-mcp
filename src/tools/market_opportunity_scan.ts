import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";
import { BLS_CYCLE_METHOD, BLS_DEMAND_CAVEATS, BLS_METRO_ACCESS } from "./federal_sources.js";
import { CENSUS_ACCESS, CENSUS_TRAPS, STATE_LOCAL_ACCESS } from "./sources.js";

const InputSchema = z.object({
  category: z.string().describe("The business category/vertical to scan for whitespace, e.g. 'coffee shop', 'massage spa'."),
  city_metro: z.string().describe("City + state/region defining the market, e.g. 'Aurora, CO'."),
});

const PAYLOAD: FrameworkPayload = {
  tool: "market_opportunity_scan",
  framework:
    "Saturation/Leakage/Whitespace (SLW) lens, gated by a mandatory Demand-Support Sanity Check — three independent gap signals (Saturation: is existing supply already absorbing available demand at commodity quality; Leakage: is demand for this category visibly escaping to substitutes, adjacent categories, or other geographies; Whitespace: where within the metro's geography and price/segment spectrum is supply structurally thin) scored independently, then every whitespace candidate is run through the Sanity Check before it's allowed to be labeled an 'opportunity.' The Sanity Check exists because an empty spot on the map is not evidence of unmet demand by default — it is at least as often evidence that the market has already, correctly, decided not to support a business there. Distinguishing the two is the entire point of this tool.",
  research_procedure: [
    {
      step: 1,
      instruction:
        "Define the category's boundaries precisely before counting anything: what counts as 'in-category,' what counts as a close substitute (different category, same underlying demand), and what's excluded entirely. Write this down as an explicit inclusion/exclusion list.",
      guidance:
        "Category-boundary sloppiness poisons every downstream count. 'Coffee shop' that inconsistently includes/excludes drive-thru-only stands, hotel-lobby cafes, and gas-station coffee counters will produce a density number that means nothing. Decide the rule first, apply it consistently, and state the rule in the output.",
    },
    {
      step: 2,
      instruction:
        "Classify the category as destination, convenience, or mixed, and size the trade area accordingly — pull population and household counts for that specific trade area, not a lazy city-limits default.",
      guidance:
        "A brewery taproom or a destination restaurant draws from an entire metro; a nail salon or a neighborhood coffee shop draws from a 2-4 mile convenience radius. Using metro-wide population to judge convenience-category density wildly understates saturation; using a tight radius to judge a destination category wildly overstates whitespace. State which type you assigned and why.",
    },
    {
      step: 3,
      instruction:
        "Enumerate every existing business in-category (plus the close substitutes flagged in step 1) within the trade area via multiple Google Maps/Places searches run from different points within the metro — not one search from the geographic center.",
      guidance:
        "Google's local-pack results shift by query origin. A single central search systematically under-counts businesses in outlying neighborhoods, which will bias the whole scan toward finding false whitespace at the edges. Search from at least 3-4 distinct points spread across the trade area. " +
        "THEN CORROBORATE THE COUNT AGAINST AN ADMINISTRATIVE ONE, because a map-search tally measures that product's ranking and radius, not the market. " +
        CENSUS_ACCESS +
        " Reconcile the two explicitly: if County Business Patterns reports materially more establishments than you enumerated, the gap is your search coverage, not whitespace — and that is the single most common way a scan invents an opportunity that is not there. A licence roster (see below) is often an even more complete list than either.",
    },
    {
      step: 4,
      instruction:
        "Compute density (businesses per capita or per household in the trade area) and benchmark that ratio against 2-3 comparable metros of similar population size, income profile, and regional culture — not a memorized national per-capita rule of thumb.",
      guidance:
        "National averages flatten real regional variation (a beer-culture metro supports more breweries per capita than a wine-culture one; a car-dependent Sun Belt metro supports fewer walkable coffee shops per capita than a dense Northeastern one). Pick comparables that are actually comparable and name them.",
    },
    {
      step: 5,
      instruction:
        "Sample reviews from the 5-8 highest-review-count existing players and read specifically for oversaturation signals: rating clustering in a narrow, undifferentiated band, verbatim price-competition or discounting language ('happy hour is the only reason to go,' 'they were running a deal so we tried it'), and complaints of interchangeability between named competitors.",
    },
    {
      step: 6,
      instruction:
        "Mine the same review corpus — and the broader category's reviews across the trade area — for underserved-demand signals disguised as complaints: wait-time mentions, 'fully booked' / 'no availability' language, explicit statements of driving to a competitor or neighboring suburb, or 'wish there was a [X] closer' phrasing. Tag each occurrence and estimate frequency; don't rely on a single quote.",
      guidance:
        "A single popular business being consistently full is evidence that business is good, not evidence of a category-wide gap — there may be five other places nearby with open tables. The signal only counts as a demand-gap indicator when it recurs across multiple businesses or when reviewers explicitly say they couldn't find an alternative.",
    },
    {
      step: 7,
      instruction:
        "Check named adjacent/substitute categories and neighboring geographies explicitly for leakage: search reviews of the substitute category or the neighboring suburb's version of this category for language indicating residents of the target trade area are traveling there to get what this category should be providing locally.",
      guidance:
        "This has to name names to count as evidence — 'demand may be leaking to bars' is not a finding; 'six reviews of Neighboring Suburb's two breweries mention driving over from [target metro] because there's nothing local' is. If you can't find that specificity, report the leakage read as unconfirmed rather than asserting it.",
    },
    {
      step: 8,
      instruction:
        "Pull trade-area population/demographic trend data (growth rate, median household income, age distribution matched to the category's typical customer) for the last 3-5 years, and separately estimate the category's own supply growth over the same window (net openings minus closings, using first-review dates and 'permanently closed' flags as proxies).",
      guidance:
        "The comparison that matters is the two growth rates against each other, not either number in isolation. A metro growing 8%/year in population with flat or declining category supply is a real signal; a metro growing 8%/year with matching category growth is not.",
    },
    {
      step: 9,
      instruction:
        "Map existing players geographically (by neighborhood/zip) against population density and income data to find zones of structural thinness — areas underserved relative to where the people and spending power actually are, not simply 'no dots on the map.'",
    },
    {
      step: 10,
      instruction:
        "For every geographic gap candidate surfaced in step 9, run the Demand-Support Sanity Check before it may be labeled an opportunity: (a) population density sufficient to support the category, (b) an income/spend proxy (median household income, home values) consistent with the category's price point, (c) realistic foot traffic and zoning — a walkable/drivable commercial corridor, not an industrial park or residential-only zone, and (d) no comparable-density precedent nearby where the category already tried and failed. A candidate must pass all four to be called genuine whitespace.",
      guidance:
        "This is the step a lazy scan skips entirely, and it's the one this tool exists for. 'No competitors within 2 miles' is a fact, not a verdict — it becomes a verdict only after checking whether the area could plausibly support one. An empty industrial corridor with no rooftops nearby is correctly empty, not undiscovered opportunity.",
    },
    {
      step: 11,
      instruction:
        "Classify existing players by price tier or positioning (e.g. budget / mid-market / premium, or the category's natural equivalent) and check whether one tier is structurally thin or absent relative to what the trade area's demographic profile would support.",
      guidance:
        "Tie the underserved-tier claim to actual demographic evidence — a trade area with a low median income and an all-premium existing set is not 'whitespace for another premium option,' it's a mismatch waiting to be corrected downward, and the real gap is probably mid-market or budget.",
    },
    {
      step: 12,
      instruction:
        "Cross-check every surfaced gap (geographic or segment) against near-term supply risk: recently announced openings, visible construction/permitting activity, or 'coming soon' signage and social posts for the same category in that zone.",
      guidance:
        "A gap that's about to be filled by an unopened competitor isn't a gap — it's a race you'd be entering late and blind. This check only catches what's publicly announced; say so explicitly rather than implying it clears the field.",
    },
    {
      step: 13,
      instruction:
        "Synthesize the saturation read, leakage read, and whitespace candidates (geographic and segment) into a ranked opportunity list. Assign each a confidence level based strictly on how many independent signal types corroborate it: one signal type = speculative, two = moderate, three or more = strong.",
    },
    {
      step: 14,
      instruction:
        "For each top-ranked candidate, write an explicit genuine-gap-vs-correctly-empty verdict that cites which specific Demand-Support Sanity Check factors it passed and which (if any) it failed or couldn't confirm.",
      guidance: "Never let a candidate reach the output with an unstated or implied sanity-check result — every ranked opportunity needs its pass/fail shown, not just asserted.",
    },
    {
      step: 15,
      instruction:
        "Before any candidate is called an opportunity, test the metro's demand base itself against federal employment data rather than against the impression left by recent local news. Pull metro Total Nonfarm employment and the category's nearest industry line, and check two things: whether the metro is adding or shedding jobs now, and whether the relevant industry is still below its own historical peak. " +
        BLS_METRO_ACCESS,
      guidance:
        "A category can look structurally thin because the demand that once supported it left and did not come back — which is a correctly-empty market wearing whitespace's clothes, and precisely what the Sanity Check exists to catch. The signal is specific and checkable: measured 2026-08-15, Wichita's aerospace employment sat 37.2% below its 1998 peak and Minneapolis's Information sector 49.1% below its 2001 peak, neither of which is visible in any current-year figure. State the industry's position against its own peak, with the peak year, for every candidate that survives.",
    },
    {
      step: 16,
      instruction:
        "For any candidate requiring real capital, state what this metro's last two downturns actually did to it. " + BLS_CYCLE_METHOD,
      guidance:
        "This is the difference between a generic recession caveat and a local one. Two metros can look identical today and have completely different recovery records, and the recovery record is the thing an operator is underwriting when they sign a five-year lease.",
    },
    {
      step: 17,
      instruction:
        "Finally, check whether anyone is already acting on this opportunity, using records that lead the market rather than reflect it: new building permits in the trade area, new business registrations in the category, and the licence roster for the category if one exists. " +
        STATE_LOCAL_ACCESS,
      guidance:
        "Everything before this step measures the market as it is. Permits and registrations are money already committed to the market as it will be in twelve months, and they are the only cheap way to notice that three other people found the same gap first. A candidate that survives every prior step and has two competitors already permitted nearby is not whitespace.",
    },
  ],
  output_schema: {
    exec_summary: "2-4 sentences: the single most important true thing about this category x metro's supply/demand balance right now, stated plainly.",
    category_definition: {
      category: "string, as scanned",
      inclusion_criteria: "string",
      exclusion_criteria: "string",
      substitute_categories: "string[] — close substitutes considered for leakage analysis (step 1)",
    },
    trade_area: {
      category_type: "'destination' | 'convenience' | 'mixed'",
      rationale: "why this type was assigned (step 2)",
      geographic_definition: "string — the actual bounds used",
      population: "number with source/vintage",
      households: "number with source/vintage",
    },
    existing_supply_snapshot: {
      business_count: "number, per the step-1 inclusion rule",
      density_per_capita: "number",
      density_benchmark_comparison: "array of { comparable_metro, their_density_per_capita, delta, why_comparable }",
      brief_competitive_note: "1-2 sentences on the existing set's general character — NOT a full positioning matrix, that's competitor_landscape's job",
    },
    saturation_signals: {
      density_read: "'oversaturated' | 'adequately_served' | 'undersaturated' | 'unclear'",
      rating_clustering: "{ band: string, is_clustered: boolean, sample_size, players_sampled }",
      price_competition_evidence: "array of { business, quote_or_signal }",
      verdict: "string",
      confidence: "'speculative' | 'moderate' | 'strong'",
    },
    demand_leakage_signals: {
      availability_evidence: "array of { business, signal, frequency_estimate }",
      substitute_absorption_evidence: "array of { substitute_category, evidence, direction_of_leakage }",
      cross_geography_leakage_evidence: "array of { origin_area, destination_area, evidence }",
      population_vs_supply_growth: "{ population_growth_rate, category_net_supply_growth_rate, gap_direction, window_years }",
      verdict: "string",
      confidence: "'speculative' | 'moderate' | 'strong'",
    },
    geographic_whitespace: {
      supply_map_summary: "string — where existing players cluster vs. where population/income actually sits",
      candidate_zones: [
        {
          zone_name_or_bounds: "string",
          population_density: "value + source",
          income_proxy: "value + source",
          foot_traffic_zoning_read: "string",
          existing_supply_in_zone: "number",
          demand_support_sanity_check: {
            population_density_pass: "boolean",
            income_spend_pass: "boolean",
            foot_traffic_zoning_pass: "boolean",
            no_failed_precedent_pass: "boolean",
            overall_pass: "boolean — true only if all four pass",
          },
          verdict: "'genuine_whitespace' | 'correctly_empty' | 'inconclusive'",
        },
      ],
    },
    segment_whitespace: {
      price_tier_map: "array of { tier, business_count, examples }",
      underserved_tier: "string | null",
      demographic_support_for_underserved_tier: "string — the evidence tying the tier gap to actual income/demand data, not just an absence",
    },
    near_term_supply_risk: "array of { signal, zone_or_segment_affected, source, how_recent }",
    ranked_opportunities: [
      {
        rank: "number",
        opportunity_type: "'geographic' | 'segment' | 'category_wide'",
        description: "string",
        corroborating_signal_count: "number",
        confidence: "'speculative' | 'moderate' | 'strong'",
        demand_support_check_summary: "string — pass/fail on each sanity-check factor that applies",
        recommended_next_step: "string — a concrete, non-speculative next validation action (e.g. 'confirm zoning with the city,' 'call the two closed comps' landlords')",
      },
    ],
  },
  quality_rubric: {
    good_looks_like: [
      "Every candidate labeled an 'opportunity' shows its Demand-Support Sanity Check pass/fail explicitly — never just 'no competitors found here, therefore opportunity.'",
      "Trade area type (destination vs. convenience) is stated and justified before any density math is run, and the radius used actually matches that classification.",
      "Density is benchmarked against 2-3 named, genuinely comparable metros — not a single memorized national per-capita figure.",
      "Leakage evidence names the specific substitute category or specific neighboring geography and cites the actual review language — not a vague 'demand may be going elsewhere.'",
      "Rating-clustering claims cite the real band and sample size ('7 of 9 players rated 3.6-4.1 across 340+ combined reviews'), not an impression of similarity.",
      "Segment whitespace ('no mid-market option') is backed by a demographic read showing the underserved tier actually fits the trade area's income profile — not asserted on absence alone.",
      "Recently announced or permitted competitors are checked before any gap is declared open (step 12 actually happened and is reported).",
      "Confidence levels are explicit per finding and tied transparently to how many independent signal types corroborate it.",
      "When the sanity check fails, the tool says so plainly — 'this area is empty because it can't support the category, not because it's undiscovered' is a valid and useful finding, not a failure to find opportunity.",
    ],
    common_failure_modes: [
      "Reporting 'I didn't find many competitors' as opportunity without checking whether population, income, or zoning can actually support one — the single most common and costly error this tool exists to prevent.",
      "Treating one busy, popular business as proof of category-wide underserved demand, when a genuinely great business can run full every night in a market with plenty of open capacity elsewhere.",
      "Using city-limits population for a convenience category (or metro-wide population for a destination category), which inflates or deflates the true demand denominator by an order of magnitude.",
      "Counting multiple locations of the same franchise or chain as independent competitors, which distorts the density math.",
      "Confusing an empty patch on the map with whitespace when that patch is an industrial park, a highway interchange with no rooftops, or a zone where the category has already opened and failed.",
      "Citing a memorized national per-capita industry rule of thumb instead of actually comparing to similar real metros.",
      "Reporting segment whitespace ('nobody's doing premium here') without checking whether the trade area's income profile supports that tier at all.",
      "Skipping the population-growth-vs-supply-growth trendline and judging the market off a single static snapshot.",
      "Letting one glowing 'no wait, great service' review outweigh a leakage read built from a genuine pattern across multiple other reviews and businesses.",
    ],
  },
  caveats: [
    "This is the most speculative of this server's tools. Detecting what EXISTS (a competitor, a review pattern, a pricing signal) is comparatively reliable; inferring the ABSENCE of adequate supply relative to real, unmet demand is an inference chain no single public data source confirms. Every 'opportunity' verdict here is a hypothesis worth validating on the ground — never a green light on its own.",
    "Population, income, and demographic figures pulled from general web search are frequently several years stale (Census ACS estimates, outdated municipal planning data). State the vintage of every figure used, and don't present a 2020- or 2021-vintage number as a current read on a fast-growing trade area.",
    "Review-based leakage signals are biased toward people who bothered to write a review about unavailability. Silent unmet demand — people who never tried because they assumed no option existed, or who quietly drive elsewhere without ever mentioning it online — is invisible to this method entirely, and probably undercounts the true gap in every case.",
    "Zoning, permitting, and actual commercial lease availability — the factors that determine whether a business can physically open in a candidate zone — are usually not resolvable via general web search. Flag any geographic candidate as needing a local commercial real estate / city planning check before real capital moves on it.",
    "A zone can look like genuine whitespace today and already have a signed, not-yet-announced lease behind it by the time anyone acts on this scan. The near-term supply risk check (step 12) only surfaces what's publicly visible — announced openings, visible permits, social posts — not private deals in progress.",
    "This tool describes market conditions, not execution risk. A genuine, well-validated gap can still fail in the hands of an operator who lacks the specific capital, skill, or differentiation the category actually needs — a market gap is necessary but never sufficient for a good outcome, and this framework should never be read as a guarantee.",
    ...BLS_DEMAND_CAVEATS,
    ...CENSUS_TRAPS,
  ],
};

export function registerMarketOpportunityScan(server: McpServer, env: Env): void {
  server.registerTool(
    "market_opportunity_scan",
    {
      title: "Market Opportunity Scan",
      description:
        "Gap analysis for a category x metro: detects underserved demand, oversaturation, and genuine whitespace using only public signals — for someone deciding whether/where to open, expand, or invest.\n\n" +
        "Example invocations:\n" +
        '- "Is there whitespace for a new brewery taproom in the North Loop, Minneapolis?"\n' +
        '- "Scan the nail salon market in Aurora, CO for underserved demand"\n' +
        '- "Where in Wichita, KS is full-service restaurant demand outrunning supply?"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Market Opportunity Scan", readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    withPolicy("market_opportunity_scan", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
