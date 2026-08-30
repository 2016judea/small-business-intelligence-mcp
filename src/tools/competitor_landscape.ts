import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";
import { CENSUS_ACCESS, CENSUS_TRAPS } from "./sources.js";

const InputSchema = z.object({
  category: z.string().describe("The business category/vertical, e.g. 'nail salon', 'brewery taproom'."),
  city_metro: z.string().describe("City + state/region defining the trade area, e.g. 'Denver, CO'."),
  radius_note: z.string().optional().describe("Optional — a specific radius or neighborhood if the default trade-area logic in the procedure shouldn't apply."),
});

const PAYLOAD: FrameworkPayload = {
  tool: "competitor_landscape",
  framework:
    "Three-Ring Competitive Filter — sort every candidate into Core (a true competitor), Watch (adjacent, worth monitoring, not real competition), or Noise (shows up in the same searches but isn't actually competing) before any positioning or saturation read happens. Core-ring membership requires passing a majority of three explicit tests (category, trade area, price tier) — never a copy-paste of the first page of Maps results. Only the Core ring gets plotted on the Positioning Grid and counted in the Saturation Index; letting Watch or Noise entries leak into either silently inflates the apparent competition and produces a false saturation verdict.",
  research_procedure: [
    {
      step: 1,
      instruction:
        "Establish the category's true service definition and name its 2-3 most common adjacent categories — the ones that share search results or get casually compared but aren't real competition (for nail salons: day spas, medspas doing nail add-ons, hair salons with a single nail chair; for casual pizza: fine-dining Italian, national chains in a different price tier).",
      guidance:
        "Do this before searching anything — it's the exclusion list step 4 checks candidates against. Skip it and the Core/Watch/Noise split gets applied ad hoc instead of against a stated definition.",
    },
    {
      step: 2,
      instruction:
        "Set the trade-area radius deliberately based on whether this category is a convenience visit or a destination visit. Convenience categories (coffee shops, nail salons, casual lunch spots) get a tight radius — roughly 1-3 miles in a dense urban core, wider in lower-density suburban/exurban areas. Destination categories (breweries, fine dining, specialty retail) get a wider radius, sometimes the whole metro. State the radius chosen and the reasoning in the output.",
      guidance:
        "A brewery taproom competes with taprooms 10 miles away; a nail salon usually doesn't. Applying a reflexive flat radius to every category is the single most common way a competitive set ends up the wrong size.",
    },
    {
      step: 3,
      instruction:
        "Pull the raw candidate pool: run the category + city/metro search on Google Maps and Google Search (add Yelp if the category skews toward it, e.g. restaurants), and list every result that falls inside the trade-area boundary from step 2. Don't stop at the first 5 map-pack results — pull 15-25 raw candidates so there's enough to filter meaningfully.",
      guidance:
        "A map search is a discovery tool, not a census — it returns what that product ranks, in a radius it chose. Before treating your pool as complete, check it against a count that does not depend on ranking. " +
        CENSUS_ACCESS +
        " If County Business Patterns reports substantially more establishments in the category than you found, the missing ones are disproportionately the newest and the smallest — exactly the entrants a positioning read most needs to see. Where the category is licensed, the licence roster is a more complete list than either source.",
    },
    {
      step: 4,
      instruction:
        "Apply the Core/Watch/Noise filter to every candidate using three tests: (a) Category test — does the candidate's own site/menu/service list show its core offering genuinely overlaps the target category, not just Google's auto-assigned label? (b) Trade-area test — does it sit inside the radius from step 2, or does its own marketing/review geography suggest a different realistic trade area? (c) Price-tier test — is it in the same or an adjacent price tier, not a different tier entirely (luxury spa vs. budget walk-in)? A candidate passing 2-3 tests is Core; passing exactly 1 is Watch; passing 0 is Noise and gets dropped.",
      guidance:
        "This is the step that does the actual work of the tool. A day spa surfacing in 'nail salon near me' results might pass the category test on paper (they do offer manicures) but fail it in substance if nails are a minor add-on to a massage-and-facials business. Record which tests each Core and Watch entry passed — not just the bucket it landed in.",
    },
    {
      step: 5,
      instruction:
        "Write one specific sentence per Watch-list entry explaining why it's adjacent rather than Core.",
      guidance: "Never dump the Watch list with a generic 'similar business, excluded' note — the reason is part of the deliverable, not a formality.",
    },
    {
      step: 6,
      instruction:
        "For each Core competitor, pull baseline vitals: star rating, review count, approximate review velocity (recent activity vs. roughly a year ago), how long they've been open/listed, and one differentiator claim pulled from their own marketing (not inferred by you).",
      guidance:
        "Target 5-8 Core competitors. Fewer than 3 usually means the trade area or category was drawn too narrow; more than 10 usually means it was drawn too wide — reconsider steps 1-2 before treating either extreme as the real answer.",
    },
    {
      step: 7,
      instruction:
        "Pull one coarse price-tier signal per Core competitor — a single anchor price point from a published menu/rate sheet, or failing that, the $/$$/$$$ signal Google shows, or a review-mention proxy ('pricey,' 'affordable,' 'worth it').",
      guidance: "This is a brief tier read only, not an itemized comparison — a full pricing audit belongs in pricing_benchmark, not here.",
    },
    {
      step: 8,
      instruction:
        "Build the Positioning Grid. Default axes are price tier x review-quality signal, but before locking that in, scan the Core set's own marketing language for a more natural second axis — many categories split more meaningfully by specialization/niche than by quality (nail salons: quick/walk-in vs. appointment-based spa vs. nail-art specialist; breweries: family-friendly taproom vs. beer-nerd destination vs. event-space/rental model). Plot every Core competitor on whichever two axes actually differentiate this specific set, and name any empty quadrant explicitly.",
      guidance:
        "Forcing price x quality onto a category that actually splits by specialization produces a grid where everyone clusters in the same box and the matrix says nothing. Check the marketing language first, every time.",
    },
    {
      step: 9,
      instruction:
        "Compute a density/saturation ratio: Core competitor count against a population figure for the trade area (city, ZIP, or metro-level population — cite the actual source and number used), expressed as competitors per 10,000 residents.",
      guidance: "Treat this as a directional approximation, not a validated industry benchmark, unless a real published per-capita benchmark for that category is findable and cited alongside it.",
    },
    {
      step: 10,
      instruction:
        "Read the clustering pattern across the Core set's review counts and ratings: are review counts tightly bunched (a mature, evenly-split market) or dominated by one outlier carrying several times the volume of the rest (a category leader capturing disproportionate share)? Are ratings clustered in a narrow band (hard to differentiate on quality alone) or spread wide (real quality gaps exist)? State the actual numbers.",
      guidance: "'Some are more established than others' is not a finding. 'One competitor has 1,400 reviews; the other six average 120' is.",
    },
    {
      step: 11,
      instruction:
        "Check for entrant/exit churn: flag any Core or Watch entry that looks recently opened (limited review history, roughly under 18 months) as a growth-or-crowding signal depending on context, and separately check whether any candidate found in step 3 has since closed or is marked permanently/temporarily closed. Note the likely reason for a closure if findable (rent, ownership change, a visible pattern in its own last reviews).",
    },
    {
      step: 12,
      instruction:
        "Synthesize a saturation verdict — undersaturated / balanced / saturated / oversaturated — citing at least two of the three signals from steps 9-11 (density ratio, clustering pattern, churn signal).",
      guidance: "Never issue the verdict from competitor count alone — a metro can have few competitors and still be saturated if the one incumbent is entrenched and demand is thin, or have many and still have room if density is high and demand keeps pace.",
    },
    {
      step: 13,
      instruction:
        "Identify positioning whitespace: a grid quadrant or niche with plausible demand (population density, category viability elsewhere in comparable metros) but thin or no Core presence. Before calling it an opportunity, check for an obvious structural reason it might be empty (zoning, foot-traffic pattern, a business that already tried there and closed) and report that check even when it comes back clean.",
    },
    {
      step: 14,
      instruction:
        "Rank the Core set by competitive threat/dominance — not alphabetically — weighting review volume, rating, and recency of activity, and name the single most dominant incumbent explicitly.",
    },
  ],
  output_schema: {
    exec_summary: "2-4 sentences: the single most important thing true about this competitive landscape right now — how crowded it is and who dominates, stated plainly.",
    scope: {
      category_definition: "string — the true service definition established in step 1",
      adjacent_categories_excluded: "array of strings — named adjacent categories excluded from Core by definition",
      trade_area: {
        radius_description: "string, e.g. '2.5 miles from downtown core'",
        radius_basis: "'convenience' | 'destination'",
        reasoning: "string — why this radius fits this category",
      },
    },
    candidate_pool: {
      raw_count: "number — total candidates pulled in step 3",
      source_platforms: "array of strings, e.g. ['Google Maps', 'Google Search', 'Yelp']",
    },
    core_competitors:
      "array of { name, tests_passed: array of 'category'|'trade_area'|'price_tier', rating, review_count, review_velocity_note, years_active_estimate, differentiator_claim, price_tier_signal }",
    watch_list: "array of { name, reason_adjacent: string — one specific sentence, never generic }",
    noise_excluded: {
      count: "number — candidates dropped as non-competitive",
      summary: "string — one line on why, as a group",
    },
    positioning_grid: {
      axis_x: "string — the chosen first axis and why it fits this category",
      axis_y: "string — the chosen second axis and why it fits this category",
      plotted_competitors: "array of { name, x_value, y_value, quadrant_label }",
      empty_quadrants: "array of { quadrant_label, note: string — whitespace or an explained structural absence }",
    },
    saturation_analysis: {
      density_ratio: {
        core_competitor_count: "number",
        population_figure: "number",
        population_source: "string — cited source, e.g. 'Census 2024 ACS, city-level'",
        competitors_per_10k: "number",
      },
      clustering: {
        review_count_pattern: "string — dominant outlier vs. evenly split, with actual numbers cited",
        rating_pattern: "string — narrow band vs. wide spread, with actual numbers cited",
      },
      churn_signals: {
        recent_entrants: "array of { name, evidence }",
        recent_closures: "array of { name, evidence, likely_reason_if_findable }",
      },
      verdict: "'undersaturated' | 'balanced' | 'saturated' | 'oversaturated'",
      verdict_evidence: "array of strings — at least 2 citations drawn from density_ratio / clustering / churn_signals",
    },
    whitespace_opportunities: "array of { description, structural_risk_check: string — what was checked and what it found, reported even when clean }",
    competitive_ranking: "array of { rank, name, dominance_basis: string }, ordered most dominant first",
  },
  quality_rubric: {
    good_looks_like: [
      "The Core list is defensible against all three filter tests from step 4 for every entry — each inclusion states which tests it passed, not just which bucket it landed in.",
      "The Watch list has a specific, named reason per entry ('primarily a massage/facials business, nails are a minor add-on') — never a generic 'similar business, excluded.'",
      "The trade-area radius is stated explicitly and matches the category's convenience-vs-destination nature, not a reflexive uniform number applied regardless of category.",
      "The positioning grid's two axes were chosen because they actually split this category's competitors — the analyst checked whether specialization is the more natural second axis before defaulting to price x quality.",
      "The saturation verdict cites at least two independent signals (e.g., density ratio AND review-count clustering), not a single number dressed up as a conclusion.",
      "Review-count and rating clustering are described in relative terms with real numbers from the actual set found ('one competitor has 1,400 reviews, the other six average 120'), not 'some are more popular than others.'",
      "A whitespace claim is checked against a plausible structural reason nobody occupies that space before being called an opportunity.",
      "The Core set size lands in a sane range (roughly 3-10) — a 1-competitor or 25-competitor 'Core' list signals the filter wasn't actually applied.",
    ],
    common_failure_modes: [
      "Copying the first 5-8 Google Maps results for the category as the competitive set, with no category/trade-area/price-tier filter applied.",
      "Counting a different location of the same competitor's own chain/franchise as a separate data point in the density count.",
      "Using one flat radius (e.g. always '5 miles') regardless of whether the category is a convenience visit or a destination visit.",
      "Treating an adjacent player that surfaced in the same search — a day spa in nail salon results, a fine-dining Italian spot beside casual pizza places — as a true competitor without running it through the exclusion tests.",
      "Defaulting to price x quality for the positioning grid even when specialization/niche is the more natural split for this specific category, producing a grid where every competitor lands in the same box.",
      "Calling a market 'saturated' from competitor count alone, with no population/density denominator and no clustering read behind it.",
      "Missing closed or inactive listings in the raw candidate pool and counting them as live competitors, silently inflating the density ratio.",
      "Presenting positioning 'whitespace' as an opportunity without checking for an obvious structural reason it's empty (zoning, no foot traffic, a business that already tried and failed there).",
      "Fabricating a population or density figure instead of citing an actual source, or presenting a rough per-capita ratio as a validated industry benchmark.",
    ],
  },
  caveats: [
    "This maps public-facing competitive presence, not every real operator — cash-only, no-website, membership-only, or word-of-mouth-only businesses are systematically under-indexed in Maps/Search results.",
    "The trade-area boundary is an analyst approximation based on category norms, not measured customer-origin data — without loyalty-program or foot-traffic data, the 'realistic radius' is inferred, not verified.",
    "Density/saturation ratios use whatever population figure is findable (city, ZIP, or metro-level), which may not precisely match the trade-area boundary used elsewhere in the analysis — treat the ratio as directional, not certified.",
    "Review counts and ratings are self-selected, platform-specific signals, not verified market share or revenue — a competitor with fewer reviews may still transact more volume through repeat or word-of-mouth business the review platforms never capture.",
    "This tool maps the field; it doesn't score a specific business's own position within it. Pair with business_teardown to place a named business onto this map, or with review_intelligence and pricing_benchmark for deeper per-competitor review and pricing reads than the brief signals captured here.",
    "New openings and closures can outpace how current search results are — always check listed businesses' operating status rather than assuming a Maps result is still trading.",
    ...CENSUS_TRAPS,
  ],
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
      annotations: { title: "Competitor Landscape", readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    withPolicy("competitor_landscape", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
