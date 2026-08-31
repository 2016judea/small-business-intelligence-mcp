import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";

const InputSchema = z.object({
  business_name: z.string().describe("The business's name as it appears on its own signage/website."),
  city_metro: z.string().describe("City + state/region, e.g. 'Aurora, CO'."),
  category: z.string().optional().describe("Category if known — narrows which map-pack searches are the right ones to check."),
});

const PAYLOAD: FrameworkPayload = {
  tool: "local_visibility_audit",
  framework:
    "The Gate-and-Rank ladder — 'Eligibility' (can Google even correctly classify and trust this listing: category match, NAP consistency, no duplicates) gates Google's own three documented local-pack ranking inputs — Relevance, Distance, Prominence — checked in that order, because a failure low on the ladder caps everything stacked above it. Score every rung independently and audit bottom-up, the same order a fix should happen in: don't let a strong Prominence read (great reviews, lots of photos) paper over a broken Eligibility rung (wrong primary category), because Google's own ranking system won't extend that same grace, and neither should this audit.",
  research_procedure: [
    {
      step: 1,
      instruction:
        "Confirm the exact Google Business Profile listing in scope. Search the business name plus city and verify there is exactly one active, correctly-attributed listing — not a duplicate, not an unclaimed near-duplicate from a former name or address, not a listing flagged as permanently closed.",
      guidance:
        "Businesses that moved, rebranded, or changed ownership often carry a ghost duplicate competing against the real listing for the same searches. A duplicate is itself a headline visibility finding — report it as such, don't bury it as a footnote.",
    },
    {
      step: 2,
      instruction:
        "Establish the business's true offering from its own website, menu, or service list — not the category Google auto-assigned — then compare that directly against the primary category currently set on the GBP listing.",
      guidance:
        "This is the single highest-leverage check in the whole audit. A nail salon mis-categorized as 'Beauty Salon' instead of 'Nail Salon' can be functionally invisible for 'nail salon near me' even with a five-star listing and 300 reviews. State plainly whether the assigned category matches what the business actually sells, and if not, name the specific correct category from Google's list.",
    },
    {
      step: 3,
      instruction:
        "Audit the secondary categories: list what's assigned and judge each one as either a genuine second line of business (defensible) or a keyword-reach attempt at an adjacent category the business doesn't really operate in.",
      guidance:
        "More categories is not better. An over-broad secondary-category list dilutes the relevance signal for the primary category instead of adding real reach, and can read as manipulation to Google's spam systems.",
    },
    {
      step: 4,
      instruction:
        "Build a NAP consistency matrix: capture the exact name/address/phone string as it appears on the GBP listing, the business's own website (footer and contact page), and each of Yelp, Facebook, Apple Maps, and Bing Places, plus one sector-specific aggregator where one exists for this category (OpenTable/Resy for restaurants, Booksy/StyleSeat for salons, Untappd for breweries, Healthgrades-style directories for services).",
      guidance:
        "Record the literal string from each source, not a 'looks the same' judgment. '123 Main St' vs. '123 Main Street Suite 2' is a real, rank-affecting mismatch even though a human reader wouldn't blink at it.",
    },
    {
      step: 5,
      instruction:
        "Inventory GBP completeness field by field: regular hours, special/holiday hours (and whether they're current, not last touched for a holiday two years ago), attributes, photo count, most recent photo upload date, whether a products/services list is populated, whether the business description field is filled in, and whether posted Q&A questions have owner-provided answers.",
      guidance:
        "Score the actual fields Google exposes on the listing, not an impression from the storefront photo. An empty or default-only field is a fail even if the listing looks fine at a glance.",
    },
    {
      step: 6,
      instruction:
        "Check posting activity: has the business used Google Posts (updates, offers, events) within roughly the last 90 days?",
      guidance: "Record the actual last-post date found, not a guess — 'no posts visible' and 'last posted 14 months ago' are different findings and both are more useful than 'inactive.'",
    },
    {
      step: 7,
      instruction:
        "Read review count, average rating, and review velocity as ranking inputs, not only as trust signals to a human reader — pull the same numbers for 2-3 category peers in the same metro (ideally ones that already show up in the map pack) to judge whether the subject's review signal is thin relative to who it's actually competing against.",
      guidance:
        "A 4.8-star listing with 9 reviews is not 'winning' if the businesses occupying the map pack are sitting at 150+. Review count and recency are documented prominence inputs, not just a quality readout — don't stop at the star rating.",
    },
    {
      step: 8,
      instruction:
        "Run the actual map-pack test: search the 2-3 most natural category-plus-location phrasings a real stranger would type, and record whether the business appears in the local pack, its approximate position, and which competitors outrank it for each query.",
      guidance:
        "'[Business name] [city]' is a branded search and will almost always surface the business — it proves nothing about real discoverability. Use category-first phrasing instead: 'nail salon [neighborhood],' 'brewery near me' evaluated from a location context inside the metro, 'best hair salon [city].'",
    },
    {
      step: 9,
      instruction:
        "Attribute what the map-pack read in step 8 reveals to each of Google's three documented local ranking inputs specifically: Relevance (does the category/name/description genuinely match the query), Distance (is the business centrally located in the searcher's likely trade area or genuinely on its edge), and Prominence (review signal, completeness, overall web presence feeding into it).",
      guidance:
        "Distance is largely non-actionable short of opening a second location — don't hand back a 'fix' for it. Name it plainly as a fixed constraint that should recalibrate how much the Relevance and Prominence fixes can realistically move the needle.",
    },
    {
      step: 10,
      instruction:
        "Audit on-page local SEO fundamentals on the live website: is the city or neighborhood name present in the page title tag or a visible heading, does the street address render as real selectable text rather than being baked into a logo or hero image, does the page hold up at a phone-width viewport, and does a view-source check turn up schema.org LocalBusiness (or a matching subtype) structured data.",
      guidance:
        "This is a fundamentals check sized for a small business, not an enterprise technical-SEO crawl. Don't chase Core Web Vitals lab scores, crawl-budget analysis, or anything this business has no realistic path to act on.",
    },
    {
      step: 11,
      instruction:
        "Cross-check the on-site NAP found in step 10 against the GBP listing from step 1 and the full matrix from step 4, and flag any drift by name — a phone number updated on the website but not on GBP (or vice versa) is a common, high-impact, easy-to-miss finding.",
    },
    {
      step: 12,
      instruction:
        "Score every individual checklist item from steps 2-10 independently as pass, partial, or fail with a one-line evidence note, before writing any narrative summary — the scored checklist is the primary deliverable here, and the narrative exists to explain it, not replace it.",
    },
    {
      step: 13,
      instruction:
        "Build the prioritized fix order using gating logic, not a severity-sorted list: primary category correctness and NAP consistency first, because nothing else about visibility matters if either of those is wrong; GBP completeness and review-signal gaps second; site fundamentals (schema markup, on-page tweaks) last, since those are the smallest levers checked in this audit.",
      guidance:
        "A common, costly mistake is leading a fix list with 'add schema markup' when the primary category is actually wrong. Order by what silently caps everything downstream of it, not by what's easiest to demo or implement first.",
    },
    {
      step: 14,
      instruction:
        "Roll steps 1-13 into the overall visibility score, tier, and exec summary, citing the specific failed or partial checklist items that drove the score down — never hand back a tier or score with no checklist evidence behind it.",
    },
  ],
  output_schema: {
    exec_summary: "2-4 sentences: the single most important thing true about this business's local visibility right now, stated plainly.",
    overall_visibility_score: {
      score: "0-100, derived from the weighted checklist below, not a gut estimate",
      tier: "'strong' | 'adequate' | 'at_risk' | 'invisible'",
      explanation: "1-2 sentences citing the specific checklist items that set the tier",
    },
    eligibility_gate: {
      listing_identity: {
        status: "'pass' | 'fail'",
        duplicate_or_ghost_listing_found: "boolean",
        evidence: "string — what was found in step 1",
      },
      primary_category: {
        current_assigned_category: "string",
        best_fit_category: "string — the correct most-specific category per step 2",
        status: "'pass' | 'partial' | 'fail'",
        evidence: "string — what the business actually sells vs. what's assigned",
      },
      secondary_categories: {
        listed: "string[]",
        assessment: "array of { category, verdict: 'genuine_line_of_business' | 'keyword_reach' }",
        status: "'pass' | 'partial' | 'fail'",
        evidence: "string",
      },
      nap_consistency: {
        matrix: "array of { source, name, address, phone, matches_gbp: boolean }",
        overall_status: "'consistent' | 'minor_drift' | 'inconsistent'",
        evidence: "string — the specific mismatches found, quoting both strings",
      },
    },
    gbp_completeness_checklist: {
      regular_hours: { status: "'pass' | 'fail'", evidence: "string" },
      special_hours_current: { status: "'pass' | 'partial' | 'fail'", evidence: "string" },
      attributes: { status: "'pass' | 'partial' | 'fail'", evidence: "string" },
      photos: { status: "'pass' | 'partial' | 'fail'", count: "number", most_recent_upload_date: "string or null", evidence: "string" },
      products_or_services_list: { status: "'pass' | 'fail'", evidence: "string" },
      business_description: { status: "'pass' | 'fail'", evidence: "string" },
      qa_section_answered: { status: "'pass' | 'partial' | 'fail'", unanswered_count: "number", evidence: "string" },
      posting_activity: { status: "'pass' | 'partial' | 'fail'", last_post_date: "string or null", evidence: "string" },
    },
    review_signal_as_ranking_input: {
      subject: { review_count: "number", rating: "number", velocity_trend: "string" },
      category_peer_comparison: "array of { competitor_name, review_count, rating, in_map_pack: boolean }",
      status: "'pass' | 'partial' | 'fail' — thin relative to peers who rank vs. genuinely competitive",
      evidence: "string",
    },
    map_pack_check: {
      queries_tested: "array of { query, in_pack: boolean, approx_position: 'number or null', competitors_outranking: string[] }",
      relevance_read: "string — per step 9",
      distance_read: "string — per step 9, explicitly flagged as a largely fixed constraint",
      prominence_read: "string — per step 9",
    },
    site_fundamentals_checklist: {
      city_or_neighborhood_in_title_or_heading: { status: "'pass' | 'fail'", evidence: "string" },
      address_rendered_as_text_not_image: { status: "'pass' | 'fail'", evidence: "string" },
      mobile_friendly_impression: { status: "'pass' | 'partial' | 'fail'", evidence: "string" },
      page_load_impression: { status: "'pass' | 'partial' | 'fail'", evidence: "string — qualitative, not a lab score" },
      localbusiness_schema_present: { status: "'pass' | 'fail'", evidence: "string — what view-source turned up, if anything" },
      onsite_nap_matches_gbp: { status: "'pass' | 'fail'", evidence: "string" },
    },
    scored_checklist_summary:
      "array of { item, rung: 'eligibility' | 'completeness' | 'review_signal' | 'map_pack' | 'site_fundamentals', status: 'pass'|'partial'|'fail', weight: 'high'|'medium'|'low', evidence } — every checklist item from every section above, flattened into one scannable list",
    prioritized_fix_order:
      "array of { priority_rank, fix, gating_rationale: 'why this caps items below it', estimated_effort: 'low'|'medium'|'high', estimated_impact: 'low'|'medium'|'high' }, ordered per step 13's gating logic — not severity-sorted",
  },
  quality_rubric: {
    good_looks_like: [
      "The primary-category check explicitly states what the business actually sells (from its own site/menu) and compares that against the GBP-assigned category by name — never assumed correct just because a listing exists.",
      "The NAP matrix quotes the literal string found on each source ('123 Main St' vs. '123 Main Street Suite 2'), not a vague 'looks consistent' judgment.",
      "Map-pack queries tested are the phrasings a real stranger would type — category-plus-location — never a branded search like '[business name] [city]' passed off as a discoverability test.",
      "Every checklist item carries both a status and a one-line evidence note; nothing is scored 'pass' or 'fail' with no citation behind it.",
      "Distance is named as a largely fixed, non-actionable constraint (short of a second location), not handed a fake 'fix.'",
      "The prioritized fix order reflects gating logic — category and NAP fixed before schema markup or photo counts — not a list sorted by what's easiest to demo.",
      "Review count and velocity are benchmarked against actual category peers who occupy the map pack, not judged in isolation against the subject's own star rating.",
      "Photo and posting-activity findings cite an actual observed date, not an inferred 'seems inactive.'",
    ],
    common_failure_modes: [
      "Treating 'has a claimed Google Business Profile' as equivalent to 'is optimized' — skipping the field-by-field completeness pass entirely.",
      "Checking NAP only on the website homepage and missing a stale address or old phone number sitting on Yelp or Bing Places.",
      "Recommending schema markup, backlinks, or photo uploads as a top priority when the primary category is actually wrong — burying the one fix that gates everything else.",
      "Testing only branded queries ('[business] [city]') and reporting map-pack presence as proof of visibility, when a category-first query would show the business is invisible for the searches that actually matter.",
      "Conflating star rating with local ranking strength — ignoring that review count, velocity, and recency are documented prominence inputs, not just a trust signal for a human reader.",
      "Assuming no duplicate listing exists without actually running a fresh, unauthenticated search for the business name and address.",
      "Over-weighting schema markup or Core Web Vitals as major findings when they're the smallest levers on this checklist relative to category and NAP.",
      "Recommending 'add more categories' as a fix without checking whether the additions are genuine lines of business or dilutive keyword-reach categories.",
      "Presenting the distance ranking factor as something the business can 'improve' with on-page or listing changes, when it's structurally fixed by the storefront's actual location.",
    ],
  },
  caveats: [
    "The GBP dashboard itself (verification status, suspension/reinstatement history, Google's internal Insights search-query data) isn't visible from outside the account — this audit reads what's publicly displayed on the listing, not the owner's private analytics.",
    "A single simulated map-pack search is directional, not a guaranteed ranking measurement — real results vary by searcher location, device, personalization, and time of day, so report it as a snapshot, not a fixed position.",
    "On-page checks (mobile-friendliness, page-load impression, schema presence) are read by inspection, not run through a live tool like PageSpeed Insights or the Rich Results Test — they're a qualitative fundamentals pass, not a lab-tested score.",
    "Google's exact local-ranking algorithm and factor weighting aren't publicly documented beyond the three named categories (Relevance, Distance, Prominence) — this audit uses that official framework as its structure but can't reverse-engineer the subject's precise internal score.",
    "This tool diagnoses discoverability mechanics — whether the business CAN be found for the right searches. It doesn't establish why a customer who found two comparable options chose one over the other; that's review-theme and competitive-positioning work, out of scope here.",
    "A NAP mismatch found on a third-party aggregator the business doesn't directly control (a data broker-fed directory, for instance) may not be same-day fixable — flag it as a fix-and-monitor item rather than implying a single edit resolves it.",
  ],
};

export function registerLocalVisibilityAudit(server: McpServer, env: Env): void {
  server.registerTool(
    "local_visibility_audit",
    {
      title: "Local Visibility Audit",
      description:
        "Audits a business's local search presence: map-pack factors, listing consistency, category selection, site fundamentals — what to check, and in what order — returned as a scored checklist.\n\n" +
        "Example invocations:\n" +
        '- "Run a local visibility audit on Fern & Fig Nail Bar in Cedar Rapids, IA"\n' +
        '- "Why doesn\'t Steel Toe Brewing show up when someone searches \'brewery near me\' in Louisville?"\n' +
        '- "Give me a scored GBP/NAP checklist for a hair salon in Aurora, CO before I redo their listing"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Local Visibility Audit", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    withPolicy("local_visibility_audit", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
