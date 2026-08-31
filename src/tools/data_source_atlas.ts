import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { FrameworkPayloadSchema, frameworkResult, type FrameworkPayload } from "./types.js";
import {
  CENSUS_ACCESS,
  CENSUS_TRAPS,
  OTHER_FEDERAL_ACCESS,
  PARCEL_GIS_ACCESS,
  PARCEL_GIS_TRAPS,
  RECORDED_SALE_ACCESS,
  REVIEW_PLATFORM_ACCESS,
  REVIEW_TRAPS,
  SALE_AND_VALUE_TRAPS,
  SILENT_WRONG_ANSWER_DISCIPLINE,
  STATE_LOCAL_ACCESS,
} from "./sources.js";
import { BLS_METRO_ACCESS, BLS_CAVEATS } from "./federal_sources.js";

const InputSchema = z.object({
  question: z
    .string()
    .describe(
      "The real question, in plain words — e.g. 'is there room for another coffee shop in Bend' or 'what did the building at 412 Main last sell for'. Not a dataset name; the point of this tool is to work out which records answer a question you can only phrase in English.",
    ),
  place: z
    .string()
    .describe(
      "The specific geography — 'Hennepin County, MN', 'Wichita, KS', 'the 78704 ZIP'. State matters more than people expect: it decides whether sale prices exist at all.",
    ),
  already_tried: z
    .string()
    .optional()
    .describe(
      "What you already looked at and what it failed to answer, if anything. Keeps the plan from re-recommending a dead end.",
    ),
});

const PAYLOAD: FrameworkPayload = {
  tool: "data_source_atlas",
  framework:
    "Source-first research planning. Most local-market questions are answered badly because the research starts with a search engine and settles for whatever it surfaces, when the actual answer sits in an administrative record that is free, complete and keyed to the exact geography being asked about. This tool inverts that: name the record that would settle the question, establish whether it exists in this jurisdiction at all, reach it directly, and only then fall back to inference — with the fallback labelled as inference. The output is a research plan and a source map, not an answer.",
  research_procedure: [
    {
      step: 1,
      instruction:
        "Restate the question as the specific fact that would settle it, then decide which of five families that fact lives in: (a) PROPERTY — who owns it, what it is worth, what it sold for, what is next to it; (b) MARKET STRUCTURE — how many of these exist here, how many are forming, how saturated it is; (c) DEMAND AND MONEY — who lives here, what they earn, whether income is arriving or leaving; (d) OPERATIONS AND REPUTATION — what customers say, what inspectors found, what is licensed; (e) PRICE AND COST — what things sell or rent for and what labour costs.",
      guidance:
        "A question that cannot be reduced to a specific settling fact is usually two questions wearing one coat — split it before choosing sources, or you will pull data for the half you happened to notice.",
    },
    {
      step: 2,
      instruction:
        "ESTABLISH THE JURISDICTIONAL FORK BEFORE ANYTHING ELSE, because it invalidates whole branches of the plan. Determine the county and state for the place given, then determine whether the state is a disclosure or non-disclosure state for real-property sale prices. " +
        RECORDED_SALE_ACCESS,
      guidance:
        "Doing this first is what stops an hour of searching for a number that was never recorded. If it is a non-disclosure state, the ratio-study bridge becomes the plan rather than a footnote, and every downstream valuation claim inherits that study's error band.",
    },
    {
      step: 3,
      instruction:
        "For a PROPERTY question, go to the county's parcel layer directly rather than to any listing site. " +
        PARCEL_GIS_ACCESS,
      guidance:
        "Listing sites answer 'what is for sale'; the parcel layer answers 'what exists, who owns it, and what it is worth', which is a superset and is free. If the question involves adjacency, frontage, corridors or assemblage, geometry is required and the projection traps below apply.",
    },
    {
      step: 4,
      instruction:
        "For a MARKET STRUCTURE or DEMAND question, use the Census APIs rather than inferring counts from map search results. " +
        CENSUS_ACCESS,
      guidance:
        "Counting how many results a map search returns is not a measurement — it is a measurement of that product's ranking. County Business Patterns gives an actual establishment count for the actual county.",
    },
    {
      step: 5,
      instruction:
        "For a PRICE, WAGE or COST question, reach the federal series directly. " + BLS_METRO_ACCESS,
      guidance:
        "The two recommendations most often issued blind are 'raise your prices' and 'add staff'. Both depend on local figures that no amount of reading reviews will produce.",
    },
    {
      step: 6,
      instruction:
        "Widen to the remaining federal files when the question is about trajectory rather than level. " +
        OTHER_FEDERAL_ACCESS,
    },
    {
      step: 7,
      instruction:
        "Add the state and local records, which are where the decisive detail usually is even though they are the least uniform. " +
        STATE_LOCAL_ACCESS,
      guidance:
        "A licence roster is frequently the only COMPLETE list of a category in a market. Review platforms only ever show you whoever got reviewed, which quietly excludes the newest and the smallest.",
    },
    {
      step: 8,
      instruction:
        "For an OPERATIONS AND REPUTATION question, be honest about what the review APIs will and will not give you before building any analysis on them. " +
        REVIEW_PLATFORM_ACCESS,
    },
    {
      step: 9,
      instruction:
        "Write the plan as an ordered list of concrete pulls — for each: the exact source, the exact endpoint or search string, the identifier or geography code needed, what field settles the question, and what you will do if it comes back empty. Mark each pull as PRIMARY (an administrative record that settles the fact) or INFERENCE (a proxy that suggests it).",
      guidance:
        "The empty-result branch is the step people skip, and it is the one that matters: an empty result from a public API almost never means 'no such thing exists here', it means the identifier was wrong, the vintage does not exist, or the cell was suppressed.",
    },
    {
      step: 10,
      instruction:
        "State plainly what the public record CANNOT answer for this question, and do not let the plan imply otherwise. Revenue, margin, profitability, rent actually paid under a private lease, customer counts, owner intent and terms of a private sale are not public anywhere in the United States. If the question needs one of those, say so as the headline finding rather than substituting a proxy and hoping.",
      guidance:
        "This is the most valuable step in the tool and the one most likely to be dropped. A research plan that quietly swaps 'revenue' for 'review velocity' has not answered the question, it has changed it.",
    },
    {
      step: 11,
      instruction:
        "Before executing, adopt the verification discipline that the specific traps are all instances of. " +
        SILENT_WRONG_ANSWER_DISCIPLINE,
    },
  ],
  output_schema: {
    question_restated: "The specific fact that would settle the question, in one sentence.",
    families: "array of which of the five families this question touches, most important first",
    jurisdiction: {
      county: "string",
      state: "string",
      sale_price_disclosure: "'disclosure' | 'non_disclosure' | 'unverified'",
      what_that_rules_out: "string — the branches of the plan this fork kills, if any",
      bridge_if_non_disclosure: "string | null — the ratio study or equivalent, and its sample definition",
    },
    plan: "array of { order, source_name, how_to_reach_it (endpoint/search string), identifier_needed, field_that_settles_it, kind: 'primary'|'inference', if_empty: string }",
    cannot_be_answered_publicly: "array of strings — the parts of this question no public record covers, stated plainly",
    traps_that_apply: "array of strings — only the traps relevant to the sources actually in the plan, not the whole catalogue",
    confidence_after_plan: "string — what the answer will and will not support once every pull above succeeds",
  },
  quality_rubric: {
    good_looks_like: [
      "The jurisdictional fork is resolved in step 2 and visibly shapes the rest of the plan, rather than appearing as a closing caveat.",
      "Every pull names a reachable endpoint or a specific search string, not a vague 'check county records'.",
      "Each pull says what happens if it returns empty — which is the common case, and almost never means the thing does not exist.",
      "Primary administrative records are exhausted before any inference or proxy is proposed.",
      "The 'cannot be answered publicly' list is non-empty for almost every real question, and is specific rather than a generic disclaimer.",
      "Only the traps that apply to the chosen sources are listed; a wall of irrelevant caveats is noise that hides the two that matter.",
    ],
    common_failure_modes: [
      "Recommending a commercial data vendor for something the county publishes free — the most common and most expensive mistake in this whole domain.",
      "Treating the number of results a map search returns as a count of businesses, when it is a measurement of that product's ranking and radius.",
      "Assuming a sale price exists because it exists where the researcher happens to live — roughly a dozen states never record one.",
      "Producing a plan whose every step is a web search, which is the behaviour this tool exists to replace.",
      "Listing the entire trap catalogue regardless of which sources the plan actually uses.",
      "Quietly substituting a proxy for an unavailable fact instead of reporting the fact as unavailable.",
      "Skipping the vintage in an API path and reporting a 404 as 'no data for this county'.",
    ],
  },
  caveats: [
    "This tool returns a research plan, not research. Every endpoint here is reached by the calling model directly, with its own tools and its own keys — this tool makes no outbound calls and holds no data. (The twin_cities_* tools on this server do fetch records, for that one metro only.)",
    "Access patterns were measured live in mid-2026 against two metros. Agencies reorganise their endpoints; if a path 404s, enumerate the service root with `?f=json` and re-find the layer rather than concluding the data is gone.",
    "Coverage and field names vary by county even where the platform is identical. A layer id that is correct in one county is meaningless in the next — discovery is per-jurisdiction, every time.",
    "Nothing in the public record reveals revenue, margin, private lease terms, or the terms of a private sale, in any US jurisdiction. No combination of the sources here adds up to financial diligence.",
    ...PARCEL_GIS_TRAPS,
    ...SALE_AND_VALUE_TRAPS,
    ...CENSUS_TRAPS,
    ...REVIEW_TRAPS,
    ...BLS_CAVEATS,
  ],
};

export function registerDataSourceAtlas(server: McpServer, env: Env): void {
  server.registerTool(
    "data_source_atlas",
    {
      title: "Data Source Atlas",
      description:
        "Given a real question about a local market or a specific property, returns a source-first RESEARCH PLAN: which public record actually settles the question, how to reach it directly (county parcel GIS, Census CBP/ACS/permits, BLS series, state registries, licences, inspections), what the answer will be worth, and what the public record cannot answer at all. Use this BEFORE researching a local market — it is the difference between reading whatever a search engine surfaced and pulling the administrative record that settles it.\n\n" +
        "Example invocations:\n" +
        '- "Where would I actually find what 1420 Grand Ave in Saint Paul last sold for?"\n' +
        '- "I want to know if Wichita has room for another dog daycare — what should I pull?"\n' +
        '- "How do I find out who really owns this building and what else they own?"\n' +
        '- "What public data would tell me if this neighborhood is actually growing?"',
      inputSchema: InputSchema,
      outputSchema: FrameworkPayloadSchema,
      annotations: { title: "Data Source Atlas", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    withPolicy("data_source_atlas", env, async (args) => frameworkResult({ ...PAYLOAD, subject: args })),
  );
}
