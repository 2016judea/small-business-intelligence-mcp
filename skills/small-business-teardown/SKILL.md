---
name: small-business-teardown
description: Run a rigorous teardown of one named small business, or a market scan of a category and metro, by chaining the analytical frameworks into one client-ready report. Use when evaluating a business to buy, advise, compete with or open near.
metadata:
  short-description: Tear down a small business into a client-ready report
---

# Small business teardown

Nine of the eleven tools return a **research framework**, not an answer:
`business_teardown`, `competitor_landscape`, `review_intelligence`,
`market_opportunity_scan`, `pricing_benchmark`, `local_visibility_audit`,
`broker_diligence_prep`, `data_source_atlas`, `compose_report`.

Each returns `framework`, `research_procedure`, `output_schema`,
`quality_rubric` and `caveats`. **You execute the procedure with web search.**
Returning the framework to the user as though it were the finding is the failure
mode this skill exists to prevent.

## Quick start

1. Start with `business_teardown` for one named business, or
   `market_opportunity_scan` for a category and metro. Pass the real name, city
   and state.
2. Execute its `research_procedure` with web search. Cite every claim.
3. Deepen with the tool that fits the gap the research opened:
   - reviews say something the rating hides → `review_intelligence`
   - "who else is doing this here" → `competitor_landscape`
   - "are they priced right" → `pricing_benchmark`
   - "why can't anyone find them" → `local_visibility_audit`
   - "should I buy it" → `broker_diligence_prep`
4. If the business is in the Twin Cities, add the actual records — what the
   building sold for, who it is billed to, whether it carries a contamination
   file. See the `twin-cities-property-record` skill.
5. Finish with `compose_report` for section order, executive-summary rules,
   citation standards and tone for the audience.

## Rules

**Research fresh, date-stamp everything.** Category multiples, prices and
review counts move. `broker_diligence_prep` deliberately refuses to carry a
hardcoded multiple table for this reason — research the range and stamp it with
the date you pulled it.

**SDE, not net income.** For any business being bought or sold, seller's
discretionary earnings is the relevant number, and what gets added back is the
argument. `broker_diligence_prep` sets out which add-backs are standard and
which are the seller's opinion.

**A rating is not review signal.** A 4.6 average can mask a bad last ninety
days. `review_intelligence` reads trajectory, complaint taxonomy and the
differentiators customers actually name — that is the finding, not the star.

**Say what you could not learn.** Every framework returns `caveats`. A teardown
that reports only what was findable, without naming what the public record
cannot show, overstates its own confidence.

## Scope

The frameworks work in any US metro. The loaded records are the seven-county
Minneapolis–St. Paul metro only. Do not imply a property figure for a business
outside that metro came from a record — it came from research, and it should say
so.
