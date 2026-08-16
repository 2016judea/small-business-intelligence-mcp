/**
 * WHERE THE PUBLIC RECORD ACTUALLY LIVES.
 *
 * This server ships methodology, not data, and makes no outbound calls — so
 * what lives here is not a dataset but the knowledge of how to reach one and
 * how to avoid the specific ways it lies. The calling model executes these
 * steps with its own tools, against the agency's own endpoint, on its own
 * behalf. Nothing here routes through us.
 *
 * WHY THIS FILE IS THE POINT OF THE WHOLE SERVER. A capable model already
 * knows how to reason about a small business. What it does not know — because
 * it is operational trivia that lives in nobody's training data — is that
 * Sedgwick County's geometry arrives in survey feet and Hennepin's in metres,
 * that Esri's `Touches` predicate returns zero touching parcels rather than an
 * error, or that Kansas does not publish sale prices at all. Every one of those
 * turns into a confidently wrong number rather than a failure. The frameworks
 * in this repo are the reasoning; this file is the map.
 *
 * GROUNDING. Every access pattern and trap below was measured live against the
 * agency's own endpoint while building a real two-metro property and review
 * corpus (Minneapolis-St. Paul and Wichita), 2026-08-14 through 2026-08-16.
 * None of it is recalled from training data. That distinction matters more than
 * usual here: a plausible-looking ArcGIS layer id or BLS series id does not
 * error, it returns an empty result that reads exactly like a place with no
 * data. Where something is general knowledge rather than measured, it says so.
 *
 * CONVENTION, borrowed from federal_sources.ts: traps are named constants
 * rather than anonymous array entries, so a tool declares which trap it is
 * carrying and a fix in one place cannot silently miss the others.
 */

// ---------------------------------------------------------------------------
// COUNTY PARCEL GIS — the richest and least-known source in the list
// ---------------------------------------------------------------------------

/**
 * How to find and pull any US county's parcel layer. This generalises: the
 * overwhelming majority of US counties publish through Esri ArcGIS REST, and
 * the discovery path is the same everywhere even though the layer names never
 * are.
 */
export const PARCEL_GIS_ACCESS =
  "County parcel, zoning, road and address data is nearly always published through an Esri ArcGIS " +
  "REST service, free and without a key. FINDING IT: search for '<county> ArcGIS REST services' or " +
  "'<county> open data', and expect one of two hosts — the county's own " +
  "(https://gis.<county>.<st>/arcgis/rest/services) or an ArcGIS Online organisation " +
  "(https://services<N>.arcgis.com/<orgId>/ArcGIS/rest/services). Append `?f=json` to any level to " +
  "enumerate it: the root lists folders and services, a service lists its layers with their ids. " +
  "A parcel layer is usually inside a folder named for land records — e.g. " +
  "`/HennepinData/LAND_PROPERTY/MapServer/1`, `/Sedgwick_County_Land_Records/FeatureServer/4`. " +
  "PULLING IT: `<layer>/query?where=1=1&outFields=*&f=json&resultOffset=<n>&resultRecordCount=<k>`, " +
  "paging on resultOffset until fewer than `k` rows come back; the layer's own JSON declares " +
  "`maxRecordCount`, typically 1000-2000, and asking for more silently returns only that many. " +
  "Add `&returnGeometry=true&outSR=<epsg>` when you need shapes. A whole mid-size county is on the " +
  "order of 100 MB and a couple of minutes, so mirror it once and query locally rather than " +
  "round-tripping per question. " +
  "WHAT IT CARRIES that no commercial source will hand you free: parcel id, owner name and mailing " +
  "address, land and building value separately, year built, building and land square footage, " +
  "zoning, legal description, and in disclosure states the recorded sale price and date. " +
  "TWO HOSTING GOTCHAS, both measured: a county's OWN host is frequently WAF-blocked to non-browser " +
  "user agents while its ArcGIS Online organisation serves the identical data anonymously, so try " +
  "the AGO org before concluding the data is unavailable; and some state-run hosts serve a leaf " +
  "certificate without its intermediate, which fails strict verification in most HTTP libraries " +
  "while succeeding in a browser — use a bundled CA store (certifi or equivalent) rather than " +
  "disabling verification, because an unverified parcel pull is one interception away from a " +
  "confidently wrong file.";

const GIS_CRS_UNITS =
  "COORDINATE SYSTEM AND UNITS ARE THE FIRST THING TO ESTABLISH, and getting them wrong produces a " +
  "plausible number rather than an error. Layers publish in their local State Plane projection, and " +
  "its units differ BY COUNTY: Sedgwick County, KS is EPSG:3420 (NAD83 / Kansas South) in US survey " +
  "FEET, while Hennepin County, MN arrives in METRES. Hard-coding a foot threshold and running it " +
  "against a metric county turns a 50 ft frontage buffer into 164 ft, and suddenly every parcel " +
  "fronts every nearby road. Worse, computing an area or length on raw EPSG:4326 degrees returns " +
  "0.0000 rather than raising. Request geometry in the layer's native projected SR, do the maths " +
  "there, and convert to 4326 only for display.";

const GIS_ESRI_TOUCHES_LIES =
  "ESRI'S `spatialRel=esriSpatialRelTouches` RETURNS ZERO TOUCHING PARCELS server-side even when the " +
  "parcels genuinely share boundaries — measured against a test block where 492 of 496 parcels sat " +
  "at a distance of exactly 0.0 ft from a neighbour. It returns an empty list, not an error, so " +
  "adjacency silently becomes 'this parcel touches nothing.' Do not trust server-side Touches: pull " +
  "the geometry, intersect locally, and filter on shared-edge length so a corner-kiss does not count " +
  "as a shared lot line.";

const GIS_UNITS_PARAM_IGNORED =
  "THE ARCGIS `units` PARAMETER ON A DISTANCE QUERY IS IGNORED. Asking for a 1320-unit buffer with " +
  "esriSRUnit_Foot, with esriSRUnit_Meter, and with no units at all returned byte-identical results. " +
  "Anything that depends on server-side buffering is therefore built on a parameter the server did " +
  "not read — mirror the geometry and do the distance maths yourself.";

const GIS_SELF_CHECK =
  "THE LAYER USUALLY CARRIES ITS OWN CHECKSUM AND ALMOST NOBODY USES IT. Counties publish parcel " +
  "area as an attribute AND the polygon it was derived from, so re-deriving area from the geometry " +
  "must reproduce the published attribute — on a fixture parcel it matched to six decimals. Compute " +
  "that match rate across the whole county before trusting anything downstream. It is the only cheap " +
  "way to know a geometry pipeline is correct, and a guard that shares the pipeline's own assumptions " +
  "would just confirm the bug.";

const GIS_REFRESH =
  "EDIT-DATE COLUMNS ARE USUALLY UNUSABLE FOR DIFFING — the parcel layer carries an edit timestamp " +
  "but it is null on most rows, so it cannot drive an incremental refresh. Make the ingest idempotent " +
  "by caching raw pages and re-pull the county wholesale on a monthly cadence instead of trying to " +
  "detect change.";

/** Every parcel-GIS trap, for a tool that touches geometry. */
export const PARCEL_GIS_TRAPS: readonly string[] = [
  GIS_CRS_UNITS,
  GIS_ESRI_TOUCHES_LIES,
  GIS_UNITS_PARAM_IGNORED,
  GIS_SELF_CHECK,
  GIS_REFRESH,
];

/** The subset worth carrying on a tool that only reads parcel ATTRIBUTES. */
export const PARCEL_ATTRIBUTE_TRAPS: readonly string[] = [GIS_SELF_CHECK, GIS_REFRESH];

// ---------------------------------------------------------------------------
// RECORDED SALES — and the wall that stops half the country
// ---------------------------------------------------------------------------

export const RECORDED_SALE_ACCESS =
  "WHETHER A SALE PRICE IS PUBLIC AT ALL DEPENDS ON THE STATE, and this is the single biggest fork in " +
  "any property or acquisition question. In a DISCLOSURE state the county publishes the recorded " +
  "consideration and the deed date, usually right on the parcel record — measured on Hennepin County, " +
  "MN, where a real sale price and date sit on roughly 87% of parcels, which makes questions like " +
  "'what did this actually trade for' and 'how far under market is the assessor' directly answerable. " +
  "In a NON-DISCLOSURE state (Kansas is one; roughly a dozen states are, and it is worth confirming " +
  "for the specific state rather than assuming) the price is simply never recorded and no amount of " +
  "digging will produce it. " +
  "WHAT TO DO INSTEAD IN A NON-DISCLOSURE STATE, because 'unavailable' is not the same as 'unknowable': " +
  "the state's own assessment oversight body publishes an annual RATIO STUDY comparing assessed values " +
  "to confidentially-collected sale prices, county by county and property class. That ratio is the " +
  "bridge — it converts a published assessed value into an estimated market value with a stated, " +
  "measured error band. Search '<state> ratio study' or '<state> division of property valuation'. " +
  "READ THE SAMPLE DEFINITION BEFORE USING THE RATIO: a study's 'Residential' class is typically " +
  "single-family houses, so applying its ratio to an apartment building is borrowing a number from a " +
  "different market. Match the class or say plainly that you could not.";

const SALE_PRICE_IS_NOT_MARKET_VALUE =
  "A RECORDED PRICE IS A TRANSACTION, NOT AN APPRAISAL. Family transfers, quitclaims between related " +
  "entities, portfolio sales allocated across many parcels, and $1 or $0 considerations all appear in " +
  "the same column as arm's-length sales. Filter to plausible arm's-length transactions and say how " +
  "you filtered, or a median gets dragged by deeds that were never a market test.";

const VALUE_IS_PER_PARCEL_NOT_PER_SITE =
  "ASSESSED VALUE IS PUBLISHED PER PARCEL AND A SITE IS OFTEN MANY PARCELS. Summing the value of every " +
  "parcel a building sits on is correct; quoting one parcel's value as the property's value understates " +
  "it, and summing every parcel an OWNER holds and calling it one property overstates it wildly. " +
  "Establish the parcel-to-site relationship explicitly before any figure is quoted.";

const ASSESSOR_LAGS_AND_UNDERSHOOTS =
  "ASSESSED VALUE IS NOT MARKET VALUE AND IS USUALLY BELOW IT, by a margin that is measurable rather " +
  "than assumed — measured against real recorded sales in one metro, the county's number ran roughly " +
  "11-13% under what comparable properties actually sold for. Assessment cycles also lag, so a value " +
  "may be a year or more stale. Quote the gap you measured, with its date, or state that you did not " +
  "measure it. Never present an assessed value as what something is worth.";

/** Every recorded-sale and valuation trap. */
export const SALE_AND_VALUE_TRAPS: readonly string[] = [
  SALE_PRICE_IS_NOT_MARKET_VALUE,
  VALUE_IS_PER_PARCEL_NOT_PER_SITE,
  ASSESSOR_LAGS_AND_UNDERSHOOTS,
];

// ---------------------------------------------------------------------------
// CENSUS — business counts, formation, permits, demographics
// ---------------------------------------------------------------------------

export const CENSUS_ACCESS =
  "The Census Bureau's APIs are free, keyed (register at api.census.gov/data/key_signup.html), and " +
  "cover four things a local-market question usually needs. " +
  "COUNTY BUSINESS PATTERNS — how many establishments of a given industry exist in a county, with " +
  "employment and annual payroll: `https://api.census.gov/data/{vintage}/cbp?get=NAICS2017," +
  "NAICS2017_LABEL,ESTAB,EMP,PAYANN&for=county:{fips}&in=state:{fips}&NAICS2017=*&key={key}`. This is " +
  "the direct answer to 'how saturated is this category here' and almost nobody reaches for it. " +
  "AMERICAN COMMUNITY SURVEY — population, income, age, tenure, commute, at geographies down to tract: " +
  "`https://api.census.gov/data/{vintage}/acs/{dataset}?get=NAME,{variables}&for={geo}&in={parent}`. " +
  "BUILDING PERMITS (new construction, a genuine leading indicator of where demand is going) come as " +
  "flat files rather than the API: `https://www2.census.gov/econ/bps/` with County/, Metro/ and CBSA/ " +
  "subdirectories. " +
  "BUSINESS FORMATION STATISTICS — new business applications, weekly and by state — is the fastest " +
  "read on whether a local economy is starting things. " +
  "VINTAGE IS PART OF THE URL AND NOT EVERY VINTAGE EXISTS: measured 2026-08, the Population Estimates " +
  "(PEP) endpoint 404s for vintages 2022-2024 and the 2023 catalogue exposes only a demographic " +
  "breakdown rather than a total-population dataset, with the last working vintage on that path being " +
  "2019. When an endpoint 404s, the answer is usually a different vintage or a different dataset, not " +
  "a missing county — and the honest substitute (ACS 1-year, a survey estimate rather than an " +
  "administrative one) must be labelled as the substitute it is.";

const CBP_SUPPRESSION =
  "COUNTY BUSINESS PATTERNS SUPPRESSES CELLS TO PROTECT INDIVIDUAL EMPLOYERS. Where an industry has " +
  "few establishments in a county, employment and payroll are withheld or published as a range flag " +
  "while the establishment COUNT still appears. Reading a suppressed cell as zero turns a small " +
  "market into an empty one — which is the exact error that makes a category look like whitespace " +
  "when it is merely thin.";

const NAICS_VINTAGE_DRIFT =
  "NAICS CODES ARE REVISED (2017 and 2022 vintages are both in circulation) and the variable name " +
  "encodes the vintage — `NAICS2017` and `NAICS2022` are different columns on different datasets. A " +
  "query built for one vintage against the other's dataset returns nothing rather than erroring. " +
  "Industry definitions also shift between vintages, so a multi-year trend spanning a revision is " +
  "comparing two slightly different industries.";

const ACS_MARGINS_OF_ERROR =
  "ACS IS A SURVEY, NOT A CENSUS, and every estimate ships with a margin of error that widens sharply " +
  "at small geographies and in 1-year tables. At tract level the margin is frequently large enough " +
  "that two neighbourhoods which look different are statistically identical. Pull the `_M` margin " +
  "columns alongside the `_E` estimates and refuse to rank places whose intervals overlap.";

export const CENSUS_TRAPS: readonly string[] = [
  CBP_SUPPRESSION,
  NAICS_VINTAGE_DRIFT,
  ACS_MARGINS_OF_ERROR,
];

// ---------------------------------------------------------------------------
// OTHER FEDERAL SOURCES worth knowing by name
// ---------------------------------------------------------------------------

export const OTHER_FEDERAL_ACCESS =
  "Four more federal files answer questions people usually guess at. " +
  "HUD FAIR MARKET RENTS — a defensible rent benchmark by metro and by ZIP (the Small Area FMRs), " +
  "published annually as spreadsheets at `https://www.huduser.gov/portal/datasets/fmr/`. It is a " +
  "programme number rather than a market asking rent, so it is a floor and a sanity check, not a comp. " +
  "FHFA HOUSE PRICE INDEX — quarterly, by metro, at " +
  "`https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_at_metro.csv`; a repeat-sales index, so " +
  "it measures how the same properties changed rather than what changed hands, which is exactly what " +
  "you want for 'is this market appreciating' and exactly what you do not want for 'what does a " +
  "building cost here.' " +
  "IRS STATISTICS OF INCOME COUNTY MIGRATION — who moved into and out of a county and the aggregate " +
  "income that moved with them, from actual filed returns rather than a survey, at " +
  "`https://www.irs.gov/pub/irs-soi/`. The single best answer to 'is money arriving or leaving here.' " +
  "BLS — metro employment, wages and prices; see federal_sources.ts in this repo, which carries the " +
  "series-id construction and six measured traps rather than repeating them here.";

// ---------------------------------------------------------------------------
// STATE AND LOCAL SOURCES — thinner, but often decisive
// ---------------------------------------------------------------------------

export const STATE_LOCAL_ACCESS =
  "Below the federal level the sources stop being uniform, so these are named as things to LOOK FOR " +
  "rather than as endpoints, and each must be located per state. " +
  "SECRETARY OF STATE BUSINESS REGISTRY — entity name, formation date, registered agent, officers, " +
  "and standing. Free and searchable in nearly every state. Formation date is a real proxy for how " +
  "long an operator has actually been operating, against a website that claims 'since 1994.' " +
  "HEALTH INSPECTIONS — county or city health departments publish restaurant and food-service scores " +
  "with violation detail, often as open data. It is the only public operational signal about a " +
  "business's back of house, and it is independent of reviews. " +
  "LICENCES — liquor, cannabis, childcare, contracting and cosmetology licences are public, and a " +
  "licence list is frequently the only COMPLETE roster of a category in a market, where review " +
  "platforms only show whoever got reviewed. " +
  "PERMITS — building and sign permits reveal money being spent before anything is visible to a " +
  "customer, and many cities publish them as open data with valuations attached. " +
  "COURT AND LIEN RECORDS — eviction filings, mechanic's liens and UCC filings are public and are the " +
  "closest a public record gets to financial distress. " +
  "IRS FORM 990 — for any nonprofit, full financials, free at ProPublica's Nonprofit Explorer.";

// ---------------------------------------------------------------------------
// REVIEW PLATFORMS — where most people start, and the least honest source here
// ---------------------------------------------------------------------------

export const REVIEW_PLATFORM_ACCESS =
  "Reviews are the most reached-for local signal and the most misread. WHAT THE OFFICIAL API GIVES " +
  "YOU IS NOT THE CORPUS: Google's Places Details endpoint returns at most FIVE reviews per place, " +
  "and they are RELEVANCE-RANKED rather than recent or random — so the five you get are a curated, " +
  "non-representative slice, and computing a sentiment trend or a complaint frequency from them " +
  "produces a real-looking number from a sample that was chosen for you. Treat the five as " +
  "illustration, never as data. A genuine review corpus needs either a paid scraping service or the " +
  "platform's own bulk export where one exists, and if you have neither, the honest move is to report " +
  "the rating and the total count and say the theme analysis could not be done. " +
  "`user_ratings_total` and the average rating ARE reliable from the API and are enough for " +
  "comparison across a competitive set.";

const REVIEWS_ARE_SELF_SELECTED =
  "REVIEW CORPORA SKEW TO THE EXTREMES — people write after an unusually good or unusually bad " +
  "experience, not a typical one. A review set is evidence about specific repeated patterns and is " +
  "not a survey of customers; presenting an average rating as satisfaction is a category error.";

const REVIEW_VELOCITY_IS_NOT_TRAFFIC =
  "REVIEW COUNT AND VELOCITY ARE NOT FOOT TRAFFIC OR REVENUE. Prompting practice differs enormously " +
  "between operators — a business that asks every customer will out-review a busier one that never " +
  "asks. Velocity is usable as a trend WITHIN one business over time and is close to meaningless as a " +
  "comparison BETWEEN businesses.";

const REVIEW_RATE_NOT_COUNT =
  "COMPARE COMPLAINT RATES, NOT COMPLAINT COUNTS. A business with four times the reviews will have " +
  "four times the complaints about anything. Any cross-business claim has to be normalised to a rate, " +
  "and any rate built on a handful of reviews needs its denominator stated next to it.";

export const REVIEW_TRAPS: readonly string[] = [
  REVIEWS_ARE_SELF_SELECTED,
  REVIEW_VELOCITY_IS_NOT_TRAFFIC,
  REVIEW_RATE_NOT_COUNT,
];

// ---------------------------------------------------------------------------
// THE HABIT THAT MATTERS MORE THAN ANY SINGLE SOURCE
// ---------------------------------------------------------------------------

/**
 * The failure mode every trap above is an instance of. Carried by any tool that
 * touches an external source, because it generalises to sources this file has
 * never heard of.
 */
export const SILENT_WRONG_ANSWER_DISCIPLINE =
  "THE DANGEROUS FAILURE IN PUBLIC DATA IS NEVER AN ERROR — it is a plausible wrong number returned " +
  "confidently. An unverified identifier returns an empty series that reads like a market with no " +
  "data; a projection mismatch returns 0.0000 instead of raising; a suppressed cell reads as zero; a " +
  "server-side spatial predicate returns an empty list instead of an answer. So: verify an identifier " +
  "against the live source before quoting anything built on it, state the vintage and geography of " +
  "every figure next to the figure, and prefer a self-check the source itself makes possible (a " +
  "published attribute you can re-derive from published geometry) over a check that shares the same " +
  "assumptions as the code being checked — a guard built on the code's own model of the data will " +
  "simply confirm the bug.";
