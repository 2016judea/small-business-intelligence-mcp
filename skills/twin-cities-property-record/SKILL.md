---
name: twin-cities-property-record
description: Answer a question about a Minneapolis-St. Paul property or market from joined public records — what it sold for, who owns it, what shares its lot line, whether it carries a contamination file. Use when the subject is inside the seven-county metro and the answer should come from an administrative record rather than from memory.
metadata:
  short-description: Answer Twin Cities property questions from the public record
---

# Twin Cities property record

The two data tools query 25 joined public-records files for the seven-county
Minneapolis–St. Paul metro. Everything below exists because guessing at this
data produces answers that look right and are wrong.

## Quick start

1. Call `twin_cities_datasets` first. It returns the real dataset ids, row
   counts, column names, scopes and per-dataset county coverage. Do not guess a
   dataset id — `sales`, `owners`, `adjacency`, `parcels`, `contamination`,
   `corridors`, `licences`, `businesses`, `flood`, `sba-loans` and the rest are
   returned by that call, and the list changes as datasets ship.
2. Call `twin_cities_records` with the `dataset` you picked. Add `address` to
   answer about one property and its surroundings; omit it to ask about the
   whole market cut.
3. Report `matching_rows` as the answer. Show rows from `sample` as examples.
   Hand the user `download_url` for the complete file.

## The four rules that stop a wrong answer

**`sample` is at most six rows; `matching_rows` is the truth.** Presenting six
rows as the whole result is the single most common way to be confidently wrong
here. Say "399 sales, here are the five closest" — never "here are the sales".

**Coverage is per dataset, never metro-wide.** It runs from one city to all
seven counties and each result states its own. `emergency-calls`, `incidents`,
`landlords` and `vacancies` are Minneapolis or Minneapolis + Saint Paul only;
`contamination` and `building-stock` are Hennepin + Ramsey; `owners` is five
counties; `sales` and `parcels` are all seven. Never carry one dataset's
counties over to another, and never report "no records" when the real answer is
"that county is not in this file."

**An ambiguous address is answered, not failed.** Several of these cities have a
Grand Ave. The tool returns the candidate cities; ask which one and call again
with the city after a comma. The whole string after the comma is read as the
city.

**`owner` and `taxpayer` are the county's tax-billing name.** That is an entity
on a tax roll, not a verified beneficial owner and not a person you have
contact details for. Say "the parcel is billed to X", not "X owns it".

## Radius

`within_ft` defaults to 5280 (one mile) and caps at 26400 (five miles). Half a
mile is 2640. State the radius you used in the answer — a comp set is
meaningless without it.

## What this data cannot answer

- **Commercial rent and lease terms do not exist in any Minnesota public
  record.** Leases are not recorded. Answer questions about occupancy cost from
  assessed value and tax per square foot, and say why rent is absent rather
  than estimating it.
- **A register is a floor, not a census.** `vacancies` holds the buildings
  somebody filed on; an address with no row is an address nobody filed on.
- Each dataset's own stated limits are at https://brickandmortar.dev/system-card/.
  Read it before quoting a figure as settled.

## Personal information

`landlords` carries `owner_phone`, `owner_email`, `applicant_phone` and
`applicant_email` from Minneapolis rental-licence filings. These are public
record and many are corporate management contacts, but some belong to named
individuals. Do not return them in response to a request for a person's contact
details, and do not volunteer them. Request the columns you actually need —
`columns` is a parameter — rather than pulling the default set and reading
contact fields aloud.
