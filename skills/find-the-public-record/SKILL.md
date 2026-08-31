---
name: find-the-public-record
description: Find which public record actually settles a question about a local market or a specific property in any US metro, then go and read it. Use before researching a local market, and whenever a question is about a place outside the Twin Cities where no dataset is loaded.
metadata:
  short-description: Locate the administrative record that settles a local question
---

# Find the public record

`data_source_atlas` returns a source-first research plan: which public record
answers the question, how to reach it directly, what the answer is worth, and
what the record cannot answer at all. It does not return the answer. You go and
get that with web search.

The difference this makes: reading whatever a search engine surfaced versus
pulling the administrative record that settles it.

## Quick start

1. Call `data_source_atlas` with the real question, including the city and
   state. It returns a `research_procedure`, an `output_schema` for the finished
   deliverable, a `quality_rubric` and `caveats`.
2. Execute the `research_procedure` yourself with web search. Go to the named
   record — the county assessor's parcel search, the recorder of deeds, the city's
   licence or inspection portal, Census CBP or ACS, a BLS series, the state
   registry — not to an aggregator that resells it.
3. Produce the deliverable in the shape `output_schema` describes, and check it
   against `quality_rubric` before answering.
4. State the `caveats`. What the record cannot answer is part of the answer.

## Rules

**Name the record, cite the pull.** Every figure carries where it came from and
when it was pulled. "The county assessor shows $X, pulled today" beats "$X".

**Non-disclosure states have no sale price.** In Kansas, Texas, Utah and the
other non-disclosure states, the recorded deed does not carry a price. Say so
and pivot to what does exist — assessed value, the assessor's own ratio study,
mortgage amount — instead of producing an estimate that reads like a record.

**Distinguish the record from the vendor.** A figure from CoStar, Zillow or a
data reseller is a product, not a public record. It can be cited as such but it
is not the administrative answer, and its methodology is usually undisclosed.

**When the record does not exist, say that.** The most valuable output of this
tool is often "no public record answers this, and here is why." Commercial rent
in Minnesota is the standing example: leases are not recorded anywhere.

## For the Twin Cities, don't use this

If the question is about the seven-county Minneapolis–St. Paul metro, the
records are already loaded and queryable — call `twin_cities_datasets` and
`twin_cities_records` instead of planning a research trip to the county portal.
