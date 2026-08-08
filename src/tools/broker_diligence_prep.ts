import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";

const InputSchema = z.object({
  business_name: z.string().describe("The target business's name."),
  city_metro: z.string().describe("City + state/region, e.g. 'Denver, CO'."),
  category: z.string().optional().describe("Category if known — determines the relevant SDE-multiple range."),
  asking_price: z.number().optional().describe("Listed asking price, if known — used to sanity-check against the multiple range, never to validate it."),
});

const PAYLOAD: FrameworkPayload = {
  tool: "broker_diligence_prep",
  framework:
    "SDE-First Triage — three lenses run in a fixed order, because running them out of order is how buyers overpay: (1) Earnings Quality — reconstruct what SDE would plausibly need to add back BEFORE any multiple is discussed, since a multiple applied to an unverified earnings number is fiction wearing a valuation's clothes; (2) Deal Plausibility — range-check the ask against a CURRENTLY-researched category multiple, adjusted for owner-dependency, lease terms, and revenue trend, never against a number this framework supplies; (3) Public Risk Surface — scan for red flags visible before any financials are shared, done independently of the seller's narrative so the buyer isn't anchored by the story before checking the facts. The seller-question list is generated last, as the direct output of the gaps the first three lenses couldn't close on their own.",
  research_procedure: [
    {
      step: 1,
      instruction:
        "Confirm identity, current operating status, and the exact selling entity. Verify address, phone, and hours via the business's Google Business Profile, and confirm it isn't marked 'permanently closed.' Separately check whether the name on the for-sale listing (if one exists), the storefront/website, and any health/liquor license filing all match.",
      guidance:
        "A mismatch between listing name, signage name, and license-of-record name is itself a finding — it can mean a recent rebrand, an undisclosed ownership change, or a stale/scraped listing being sold by a broker who hasn't verified the entity either. Don't smooth this over; report it.",
    },
    {
      step: 2,
      instruction:
        "Establish the true category and sub-category from the business's own menu/service list/website, not Google's auto-assigned category. Then classify its owner-dependency archetype: is this a personality- or skill-driven concept (chef-owner restaurant, single-stylist salon where clients follow the person) or a systemized, staff-run operation the owner could plausibly step back from?",
      guidance:
        "Owner-dependency archetype is not a footnote — it is one of the three variables that moves the multiple in step 6, and it is usually the single biggest reason a business is priced above or below its category's midpoint.",
    },
    {
      step: 3,
      instruction:
        "Collect every public sizing signal available, explicitly as sizing proxies, not financial data: any gross-revenue figure stated in a for-sale listing description, employee count from LinkedIn/Indeed job postings or a 'meet the team' page, seating capacity or square footage for a restaurant/retail concept, and unit count if multi-location.",
      guidance:
        "Label this section's confidence as low or very low no matter how precise the numbers look — a listing's stated 'gross revenue' is broker/seller-supplied and unverified by definition at this stage.",
    },
    {
      step: 4,
      instruction:
        "Build the SDE add-back checklist as a hypothetical framework, not a computed number — no real financials exist at pre-diligence. For each standard add-back category (owner's salary/draw, owner's health insurance, a vehicle or travel expense plausibly personal, one-time repair/legal/litigation costs, non-cash depreciation/amortization, family members on payroll, above- or below-market related-party rent), state whether it's likely, unlikely, or unknown to apply to a business of this size and category — and why.",
      guidance:
        "State plainly why SDE (not EBITDA, not reported net income) is the right lens: a small owner-operated business runs personal expenses through the P&L and pays the owner a below-market or zero 'salary' by design, so reported net income systematically understates what the business actually throws off for a new owner-operator. Applying a multiple straight to reported net income — or straight to EBITDA without adding back owner comp — is the single most common way an unsophisticated buyer misprices a small-business deal, in both directions.",
    },
    {
      step: 5,
      instruction:
        "Search for a CURRENT multiple range for this specific category — recent (last 12-18 months) business-brokerage market reports (BizBuySell Insight Report, IBBA/M&A Source Market Pulse), the relevant trade or industry association's sale-comp commentary, and any recent local comparable-sale reporting. Record the publication date of whatever range you find alongside the range itself.",
      guidance:
        "Do not use any multiple figure you already 'know' — treat it as expired the moment you didn't verify it today. If you can't find a source published within the last two years, say so explicitly and widen the caveat rather than presenting a stale or half-remembered number as current.",
    },
    {
      step: 6,
      instruction:
        "Adjust the researched category range using three factors, stated individually: owner-dependency (step 2 — a highly owner-dependent business prices at the low end or below the range, since the buyer is also buying key-person risk), lease terms (years remaining, renewal options, and whether the lease is transferable/assignable — a short or non-transferable lease caps what a rational buyer pays regardless of earnings), and revenue trend (a business on a visible 2-3 year upswing supports the high end; a visible decline argues for the low end or a structure with an earnout).",
      guidance:
        "Don't just restate the raw range — commit to where within (or outside) it this specific business plausibly falls, and name which of the three factors is doing the most work in that call.",
    },
    {
      step: 7,
      instruction:
        "If an asking price was provided, compute its implied multiple against whatever earnings proxy is actually available. If no SDE proxy exists (the normal case pre-diligence), compute a revenue multiple instead if a revenue figure was found in step 3, and label it explicitly as a weaker substitute.",
      guidance:
        "State the arithmetic (asking price ÷ proxy earnings or revenue = implied multiple) in the output so it's checkable, not just an asserted conclusion.",
    },
    {
      step: 8,
      instruction:
        "Compare the implied multiple from step 7 against the adjusted range from step 6 and flag it directionally only — 'plausible,' 'rich,' 'aggressive,' or 'insufficient data to flag.' Never phrase this as a valuation, a fair price, or a number to negotiate from.",
      guidance:
        "The correct sentence shape is 'the asking price implies a multiple toward the high end of what's typical for this category, which is worth probing given [specific factor from step 6]' — never 'this business is worth $X.'",
    },
    {
      step: 9,
      instruction:
        "Scan review velocity and rating trend over the last 12-24 months (reviews per month, trailing-12 vs. prior-12 average rating) for a declining pattern, and read the most recent 15-20 reviews plus the lowest-rated recent ones for recurring operational complaints.",
      guidance:
        "A rating that's stable but slowing sharply in volume is its own red flag (declining demand) distinct from a rating that's dropping — report them as separate signals, don't collapse them into one.",
    },
    {
      step: 10,
      instruction:
        "Scan specifically for ownership or key-staff change signals inside the review text and on staff-facing platforms: reviews mentioning 'new owner,' 'new management,' or a named staff member customers ask for who no longer appears to work there; a LinkedIn profile showing a manager or chef's recent departure; a sudden shift in review tone or response style (different voice answering owner responses) at an identifiable date.",
    },
    {
      step: 11,
      instruction:
        "Check lease and location risk: search whether the address has a history of tenant turnover (prior different businesses at the same address within the last 5-10 years), whether the space or an adjacent unit is currently listed for lease/sublease on a commercial real estate site, and whether the immediate retail corridor shows visible vacancy or a departed anchor tenant.",
    },
    {
      step: 12,
      instruction:
        "Check licensing and public-record signals appropriate to the category: health inspection scores/violations for a food business, liquor license status and any pending transfer or violation for an alcohol-serving business, and a basic county court record search for pending litigation naming the business or owner.",
      guidance:
        "Treat one old, resolved violation as noise; treat a pattern of repeat violations or a currently-open license issue as a real flag worth naming explicitly.",
    },
    {
      step: 13,
      instruction:
        "Check for heavy discount-platform reliance as a margin-thinning signal: an active or frequently-used Groupon/LivingSocial listing, a pattern of aggressive percentage-off social posts, and reviews that specifically mention the deal as the reason for the visit ('came in because of the Groupon, probably wouldn't pay full price').",
    },
    {
      step: 14,
      instruction:
        "Check for operational-strain signals: posted hours that don't match what reviews describe finding on arrival, mentions of unexplained early closures or 'closed today' social posts, and any recent uptick in reviews citing being short-staffed or slow. Then synthesize steps 1-14 into a ranked seller-question list generated FROM the specific gaps and unknowns those steps surfaced — never a generic template list — ordered by how much a single answer could change the deal (an SDE add-back that turns out fabricated changes everything; a preferred parking spot does not).",
      guidance:
        "Every question on the final list should trace to a specific unresolved item earlier in the procedure. If a question doesn't map to a gap you actually found, cut it.",
    },
  ],
  output_schema: {
    exec_summary: "2-4 sentences: the single most important thing a buyer should know before spending another hour on this target.",
    target_identity: {
      verified_name: "string",
      address: "string",
      category: "string",
      sub_category_or_concept: "string",
      owner_dependency_archetype: "'personality_driven' | 'systemized' | 'mixed', with one-line justification",
      entity_consistency: "'consistent' | 'inconsistent' — whether listing/signage/license names match, with specifics",
    },
    sizing_signals: {
      employee_count_estimate: "number or null",
      employee_count_source: "string",
      capacity_or_sqft_estimate: "value or null, with source",
      public_revenue_mention: "value or null, with source",
      confidence: "'low' | 'very_low' — always, at this stage",
    },
    sde_framing: {
      why_sde_not_ebitda_or_net_income: "string — the core explanation from step 4",
      addback_checklist: "array of { addback_category, typically_covers, likely_applies_here: 'likely'|'unlikely'|'unknown', rationale }",
      explicit_status: "string — states plainly that no real SDE figure exists yet, this is a checklist to apply once financials are shared",
    },
    multiple_research: {
      category_multiple_range: "{ low, high, as_of_date, sources: string[] } — must be from a source found THIS session, not assumed",
      adjustment_factors: {
        owner_dependency: "string — direction and magnitude of adjustment, from step 6",
        lease_terms: "string — years remaining, transferability, and effect on price ceiling",
        revenue_trend: "string — upswing/flat/decline and effect on range placement",
      },
      adjusted_plausible_range_note: "string — where in (or outside) the raw range this specific business plausibly sits, and why",
    },
    asking_price_sanity_check: {
      provided: "boolean",
      asking_price: "number or null",
      implied_multiple_basis: "'sde_proxy' | 'revenue_proxy' | 'insufficient_data'",
      implied_multiple: "number or null, with the arithmetic shown",
      directional_flag: "'plausible' | 'rich' | 'aggressive' | 'insufficient_data'",
      flag_rationale: "string",
      explicit_disclaimer: "string — states this is a directional flag, never a valuation, appraisal, or negotiating anchor",
    },
    red_flag_scan: {
      review_trend: "{ velocity_trend, rating_trend, recurring_complaint_themes: string[] }",
      ownership_staff_change_signal: "{ detected: boolean, evidence }",
      lease_location_risk: "{ detected: boolean, evidence }",
      licensing_legal_signal: "{ detected: boolean, evidence }",
      discount_reliance_pattern: "{ detected: boolean, evidence }",
      operational_strain_pattern: "{ detected: boolean, evidence }",
      overall_flag_count: "number",
      overall_severity_read: "'clean' | 'minor_flags' | 'material_flags' — with one-line justification, never silent on an absence of flags",
    },
    seller_questions: "array of { priority_rank, question, why_it_matters, which_gap_it_closes }, ordered highest-stakes first",
  },
  quality_rubric: {
    good_looks_like: [
      "SDE add-backs are presented as a checklist to verify against real documents later, never as a computed number this session invented from a listing description.",
      "The multiple range is dated and sourced to something found this session — the output states plainly when no source newer than ~2 years could be found, rather than presenting an old or half-remembered figure as current.",
      "The asking-price sanity check (when present) reads as a flag with a stated rationale, never as a value judgment on whether the business is 'worth it.'",
      "Owner-dependency, lease terms, and revenue trend are each discussed individually with a specific effect on the range — not folded into one vague 'this business seems risky' paragraph.",
      "Every red flag traces to a specific piece of public evidence (a review quote, a CRE listing, an inspection record) — not a hunch.",
      "An absence of red flags is stated as 'no public red flag surfaced' rather than implied as 'this business is healthy' — those are not the same claim.",
      "Seller questions map one-to-one to a specific unresolved gap surfaced earlier in the output — no generic boilerplate question makes the final list unless it traces to real uncertainty here.",
      "The output distinguishes clearly, in its own language, between 'pre-diligence screening' and 'diligence' — it never implies financials have been reviewed.",
    ],
    common_failure_modes: [
      "Computing an actual SDE dollar figure from a for-sale listing's self-reported 'gross revenue' — there is no way to do this legitimately pre-diligence, and doing it anyway launders a broker's marketing number into a fake analytical one.",
      "Stating a category multiple range with confident specificity and no source or date — the exact 'stale table presented as current fact' failure this tool exists to prevent.",
      "Turning the asking-price sanity check into an implied valuation ('this business is worth $X') instead of a directional flag with a stated rationale.",
      "Treating an absence of visible red flags as evidence the business is clean, when it just means nothing bad happened to be public.",
      "Applying a generic category multiple without adjusting for owner-dependency — pricing a single-chef-driven restaurant the same as a systemized, multi-manager one in the same category.",
      "Presenting a Groupon presence or discount pattern as automatically disqualifying rather than as one data point about margin and customer quality that a real diligence conversation should probe.",
      "Producing a seller-question list that reads like a generic 'questions to ask before buying a business' template instead of questions that trace to gaps this specific research actually surfaced.",
      "Skipping the entity-consistency check in step 1 and running the whole analysis on a listing that turns out to describe a different location or a stale/already-sold business.",
      "Ignoring lease transferability entirely — a great business on a lease that doesn't survive a change of ownership is a fundamentally different (and often much worse) deal than the earnings alone suggest.",
    ],
  },
  caveats: [
    "This is a pre-diligence screen, not diligence, not an appraisal, and not a valuation. Nothing in this output should be quoted to a lender, an investor, or written into a letter of intent as if it were a verified figure — the earliest real number in a small-business sale comes from tax returns and bank statements this tool never sees.",
    "SDE add-backs are exactly where sellers and their brokers most aggressively pad the number that drives the sale price. Every add-back listed here is a hypothesis to verify against receipts, not a claim to accept — 'the owner says $40K of that was personal travel' is worth nothing without the credit card statement.",
    "A multiple range found via web search today can still be stale, thin-sample, self-reported by brokers with a closing-fee incentive to lean optimistic, or simply not representative of this specific market. Verifying a source exists and is recent is not the same as verifying it's right — say so if the sourcing is thin.",
    "Public red flags are necessary to check but nowhere near sufficient — the absence of a visible red flag is not evidence of a healthy business, only evidence that nothing bad happened to surface on a public platform. Plenty of businesses fail diligence for reasons no review or listing ever mentions (customer concentration, a handshake vendor deal, unrecorded cash practices).",
    "A franchise or licensed-concept unit's real economics are driven by the franchise or license agreement itself — royalty percentage, marketing fund contribution, territory protection, remaining term, and transfer approval rights — far more than by the generic category multiple this framework points toward. Flag explicitly if the target is a franchise unit and treat the category range as a rougher starting point than usual.",
    "If web search access returns thin, contradictory, or clearly outdated results for the multiple research or the red-flag scan, report that limitation explicitly in the output rather than filling the gap with a plausible-sounding but unverified number — a stated 'insufficient data' is more useful to a buyer than false confidence.",
  ],
};

export function registerBrokerDiligencePrep(server: McpServer, env: Env): void {
  server.registerTool(
    "broker_diligence_prep",
    {
      title: "Broker Diligence Prep",
      description:
        "Pre-diligence framework for a business broker or buyer evaluating a target: SDE framing (why the discretionary-earnings figure, not net income or raw EBITDA, is the relevant number, and what typically gets added back), a category multiple range the model must research fresh and date-stamp (never a hardcoded table), a public-signal red-flag checklist run before any financials are shared, and a prioritized seller-question list built from the specific gaps the research actually surfaces.\n\n" +
        "Example invocations:\n" +
        '- "Prep me for diligence on a brewery taproom listed in Minneapolis, MN"\n' +
        '- "What questions should I ask the seller of a hair salon in Wichita, KS before I make an offer?"\n' +
        '- "This restaurant is asking $650K — what red flags should I check before taking that seriously?"\n' +
        '- "I\'m looking at a nail salon in Tampa, FL asking $310K — sanity-check that against category multiples before I meet the seller"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Broker Diligence Prep", readOnlyHint: true, openWorldHint: true },
    },
    withPolicy("broker_diligence_prep", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
