/**
 * Shared federal-data methodology.
 *
 * The tools that consume this module ship methodology, not data, and make no
 * outbound calls — so
 * what lives here is not a dataset but the knowledge of how to reach one and
 * how to avoid the specific ways it lies. The calling model executes these
 * steps with its own tools.
 *
 * Every series template, availability claim and trap below was VERIFIED
 * against the live BLS Public Data API on 2026-08-15 while backfilling the
 * Brick & Mortar federal layer for CBSA 33460 (Minneapolis-St. Paul) and
 * 48620 (Wichita). None of it is recalled from training data, which is the
 * only reason it is safe to state series-ID construction this precisely: a
 * plausible-looking series ID that does not exist returns "Series does not
 * exist" rather than an error, and an unverified one returns an empty series
 * that reads exactly like a market with no data.
 *
 * Kept as shared fragments rather than copied per tool: the traps are
 * properties of the source, not of any one analysis, and a trap fixed in one
 * tool and not the others is how a corrected number goes back to being wrong.
 */

/**
 * How to reach metro-level labor and price data. Written as a research step
 * body — concrete enough to execute, not a pointer to "check BLS."
 */
export const BLS_METRO_ACCESS =
  "Use the BLS Public Data API v2 (POST JSON to https://api.bls.gov/publicAPI/v2/timeseries/data/ " +
  "with {seriesid, startyear, endyear}). A free registration key raises the limit from 25 requests " +
  "per day to 500 and the per-request window from 10 years to 20; without one, request in 10-year " +
  "chunks. Series IDs are constructed, not searched: " +
  "METRO EMPLOYMENT BY INDUSTRY is 'SMU' + 2-digit state FIPS + 5-digit CBSA + 8-digit industry code " +
  "+ '01' (all employees, in thousands, not seasonally adjusted) — e.g. SMU27334600000000001 is " +
  "Total Nonfarm for CBSA 33460. Industry codes include 00000000 Total Nonfarm, 05000000 Total " +
  "Private, 70720000 Accommodation and Food Services, 65620000 Health Care and Social Assistance, " +
  "42000000 Retail Trade. " +
  "SEASONALLY ADJUSTED is the same ID with the 'SMS' prefix, and BLS publishes it at metro level for " +
  "TOTAL NONFARM ONLY — every industry code returns 'Series does not exist' under SMS. " +
  "METRO UNEMPLOYMENT is 'LAUMT' + state FIPS + CBSA + '000000' + measure ('03' rate, '04' " +
  "unemployed, '05' employed, '06' labor force). " +
  "METRO PAY is the employment ID with data type '02' (average weekly hours), '03' (average hourly " +
  "earnings) or '11' (average weekly earnings) — published for the TOTAL PRIVATE aggregate " +
  "(05000000) only, not for any individual industry. " +
  "CONSUMER PRICES are 'CUUR' + 4-character area + item code (SA0 all items, SAH1 shelter, SEHA rent " +
  "of primary residence, SEFV food away from home, SAF11 food at home). " +
  "COUNTY INDUSTRY DETAIL (employment, establishment counts and average weekly wages by NAICS, with " +
  "location quotients) comes from QCEW as CSV, not from this API: " +
  "https://data.bls.gov/cew/data/api/{year}/a/area/{area}.csv, available from roughly 2015. " +
  "Metro employment and unemployment series run back to 1990, so there is no reason to characterize " +
  "a market's cycle from the last few years alone.";

/**
 * The single highest-value thing this data can say about a local market, and
 * the one a general model reliably gets wrong by reaching for national
 * recession dates instead of the metro's own record.
 */
export const BLS_CYCLE_METHOD =
  "Characterize the metro's DOWNTURN BEHAVIOUR from its own history rather than from national " +
  "recession dates, because local labour markets and the national calendar genuinely diverge. Pull " +
  "the seasonally adjusted Total Nonfarm series (SMS prefix) back to 1990, find each peak-to-trough " +
  "contraction, and record how deep it went and how many months it took to regain that peak. Treat " +
  "an episode as closed once employment has won back half the ground it lost — otherwise a market " +
  "that stayed below an old high for years reads as ONE long contraction, which is a real failure " +
  "mode and not a hypothetical: measured 2026-08-15, the naive definition reported Wichita as a " +
  "single 15.5% decline running from July 2008 to a trough in April 2020, welding the financial " +
  "crisis and the pandemic into one event that never happened. Done correctly the same metro shows " +
  "a 9.3% decline from 2008 that took 180 months to undo and a separate 14.7% pandemic drop that " +
  "took 36 — and that contrast, not either number alone, is what a downside case should be built " +
  "from.";

/**
 * Traps that each produce a plausible wrong number rather than an error. Every
 * one was hit for real. Named individually rather than indexed out of an array
 * so a tool declares which trap it is carrying and why.
 */
const NESTED_AGGREGATES =
  "BLS metro industry employment rows are NESTED AGGREGATES, not a partition — Accommodation and " +
  "Food Services sits inside Leisure and Hospitality, Health Care sits inside Education and Health " +
  "Services, and Federal plus State plus Local equals Government. Adding the published rows " +
  "together roughly triples a metro's real job count. Every figure must be attributed to its own " +
  "level, and shares must be taken against the aggregate that actually contains them.";

const WORKPLACE_VS_RESIDENCE =
  "CES counts jobs by PLACE OF WORK and LAUS counts people by PLACE OF RESIDENCE. The two will not " +
  "reconcile and are not meant to — in a metro with heavy in-commuting the job count legitimately " +
  "exceeds the employed-residents count, and presenting the gap as an error or a data problem is " +
  "a misreading.";

const NOISY_SINGLE_MONTH =
  "A single month's year-over-year change on a not-seasonally-adjusted series can point the opposite " +
    "way from the trend, and the newest one or two months are preliminary and get revised. Metro " +
    "average hourly earnings in Minneapolis printed -0.3% year over year in June 2026 against annual " +
  "averages that had risen every year since 2018. Read the annual averages for direction and the " +
  "latest month only for level.";

const NO_LOCAL_CPI =
  "BLS publishes a local CPI for roughly two dozen metros and no others. For everywhere else the " +
  "nearest real figure is the census region (e.g. 'Midwest urban'), which is a multi-state " +
  "aggregate and must be labelled as one — quoting it as the city's inflation rate is inventing a " +
  "local number. Publication frequency also varies BY ITEM within a single area, not just between " +
  "areas: in Minneapolis the all-items index publishes in odd months only while shelter and rent " +
  "publish monthly.";

const RENT_SERIES_LAGS =
  "CPI 'rent of primary residence' measures what SITTING TENANTS pay, so it lags asking rents on new " +
  "leases by roughly a year. It is the right series for what an existing rent roll is doing and " +
  "the wrong one for what a vacant space would lease at today. CPI index LEVELS also sit on " +
  "different base periods by area and must never be compared across areas — only rates of change " +
  "are comparable.";

const PAY_IS_TOTAL_PRIVATE =
  "Metro-level pay from CES covers Total Private only, includes salaried and supervisory staff, and " +
  "is an average across every private industry — it is not an entry-level wage, not a wage for the " +
  "category being analyzed, and not a household income. For pay within a specific industry use " +
  "QCEW's county-level average weekly wage instead, and say which one is being quoted.";

/** Every trap, for a tool that touches all of this data. */
export const BLS_CAVEATS: readonly string[] = [
  NESTED_AGGREGATES,
  WORKPLACE_VS_RESIDENCE,
  NOISY_SINGLE_MONTH,
  NO_LOCAL_CPI,
  RENT_SERIES_LAGS,
  PAY_IS_TOTAL_PRIVATE,
];

/** The subset worth carrying on any tool that reasons about local demand. */
export const BLS_DEMAND_CAVEATS: readonly string[] = [
  NESTED_AGGREGATES,
  WORKPLACE_VS_RESIDENCE,
];

/** The subset worth carrying on any tool that reasons about price or pay. */
export const BLS_PRICE_CAVEATS: readonly string[] = [
  NO_LOCAL_CPI,
  RENT_SERIES_LAGS,
  PAY_IS_TOTAL_PRIVATE,
  NOISY_SINGLE_MONTH,
];
