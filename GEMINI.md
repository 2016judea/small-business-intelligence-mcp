# Brick & Mortar — public records for the Twin Cities

This extension connects a free, read-only MCP server at
`https://brickandmortar.dev/mcp`. Nothing it exposes writes, sends or deletes.

## Reach for it when

* A question is about a **specific property or business in the seven-county
  Minneapolis–St. Paul metro** — what it sold for, what it is assessed at, what
  permits or licences it holds, what is contaminated or in a flood zone nearby.
* A question is about the **shape of that local market** — how many businesses in
  a trade, what they pay, what buildings were built when, what sale prices per
  square foot look like.
* Someone needs to know **which public record answers a question in any other US
  city**. `data_source_atlas` names the administrative source rather than
  guessing at one.

## The one limit that matters

**The records are Minneapolis–St. Paul only.** `twin_cities_records` and
`twin_cities_datasets` cannot answer for Denver, Chicago or anywhere else, and
they will say so. The other nine tools are research frameworks — they work in any
American metro, but they return a method for you to execute, not data.

## What the answers are made of

County and city public records, joined: parcels, recorded sales, assessor values,
business licences, building permits, inspections, emergency calls, contamination
sites, flood zones and wages. Each file states its own capture date and its own
limits; when a number matters, say which record it came from. The same files are
downloadable as CSV, XLSX, JSON and GeoJSON at brickandmortar.dev/datasets under
CC BY 4.0.
