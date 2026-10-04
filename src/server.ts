import { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "./env.js";
import { registerBusinessTeardown } from "./tools/business_teardown.js";
import { registerCompetitorLandscape } from "./tools/competitor_landscape.js";
import { registerReviewIntelligence } from "./tools/review_intelligence.js";
import { registerLocalVisibilityAudit } from "./tools/local_visibility_audit.js";
import { registerPricingBenchmark } from "./tools/pricing_benchmark.js";
import { registerBrokerDiligencePrep } from "./tools/broker_diligence_prep.js";
import { registerMarketOpportunityScan } from "./tools/market_opportunity_scan.js";
import { registerComposeReport } from "./tools/compose_report.js";
import { registerDataSourceAtlas } from "./tools/data_source_atlas.js";
import { registerTwinCitiesCatalogue, registerTwinCitiesRecords } from "./tools/twin_cities.js";
import { registerFeatureRequest } from "./tools/feature_request.js";
import {
  registerBringYourDocument,
  registerStartAnEngagement,
  registerTwinCitiesLookup,
  registerWatchTeardowns,
  registerWhatWeHaveForYou,
} from "./tools/platform.js";
import { registerPrompts } from "./prompts.js";

/**
 * Builds one McpServer instance per HTTP request (see src/index.ts —
 * createMcpHandler is constructed fresh per request so `env`, which Workers
 * only hands you at fetch()-time, can close over every tool's handler).
 * NO TOOL HOLDS STATE BETWEEN CALLS, which is what justifies the stateless
 * createMcpHandler over the Durable-Object-backed McpAgent. Note the nine
 * methodology tools are pure functions of their input; the two Twin Cities tools
 * are NOT — they make one outbound read-only GET to brickandmortar.dev. That
 * changes purity, not statefulness, so the architecture choice still holds.
 *
 * ORDER IS DELIBERATE AND IS THE ONLY PLACE TOOL PRECEDENCE IS EXPRESSED. A
 * client shows tools in registration order and a model skims that list, so
 * data_source_atlas is registered FIRST: it is the one tool that changes what
 * the others are worth. Every framework here tells a model how to reason about
 * a business; the atlas tells it where the records actually are, which is the
 * half a capable model does not already know.
 */
/**
 * THE TOOL NAMES, IN REGISTRATION ORDER, AS ONE LIST — so nothing has to count
 * them by hand.
 *
 * WHY IT EXISTS. Before 2026-08-20 the count was typed into the README twice, the
 * docs page three times, the landing page, SUBMISSION.md twice and two source
 * comments — and it had ALREADY drifted: `tools/types.ts` said "every one of the
 * 8 tools" in one comment and "all nine tools" eleven lines below it, both about
 * the same nine. Adding two made every one of those wrong at once, which is the
 * argument for deriving rather than for a careful find-and-replace.
 *
 * The registration calls below stay explicit and ordered — order is tool
 * precedence and a loop over a map would hide it — so this list is asserted
 * against them by the test in scripts/, not trusted to stay in step by hand.
 */
export const TOOL_NAMES = [
  "data_source_atlas",
  "what_we_have_for_you",
  "twin_cities_lookup",
  "twin_cities_datasets",
  "twin_cities_records",
  "bring_your_document",
  "business_teardown",
  "competitor_landscape",
  "review_intelligence",
  "local_visibility_audit",
  "pricing_benchmark",
  "broker_diligence_prep",
  "market_opportunity_scan",
  "compose_report",
  "watch_teardowns",
  "start_an_engagement",
  "request_a_feature",
] as const;

export const TOOL_COUNT = TOOL_NAMES.length;

export function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: "small-business-intelligence",
    version: "0.1.0",
    title: "Small Business Intelligence by Brick & Mortar",
  });

  registerDataSourceAtlas(server, env);
  // THE FRONT DOOR, SECOND. The platform is organised by who you are (bricks,
  // 2026-09-30: EVERYTHING FLOWS THROUGH A ROLE), and until 2026-10-02 this
  // server could not say so — it knew the datasets and nothing about the shelf
  // they sit on. The role picker goes before the records because a model that
  // meets it first asks "what do you do" the way the page does, and the lookup
  // goes with it because an address is the other thing a person arrives holding.
  registerWhatWeHaveForYou(server, env);
  registerTwinCitiesLookup(server, env);
  // IMMEDIATELY AFTER THE ATLAS, AND THAT IS THE WHOLE ORDERING ARGUMENT. The
  // atlas tells a model where a record can be found; these two ARE the record,
  // already joined, for one metro. A model skimming this list in order meets
  // "where to look" and then "here it is for Minneapolis-St. Paul" — which is the
  // only pair on the list where the second answers the first outright.
  //
  // They are also the only two tools here that make a remote call. See
  // tools/twin_cities.ts for why that reverses this server's founding rule and
  // who reversed it.
  registerTwinCitiesCatalogue(server, env);
  registerTwinCitiesRecords(server, env);
  // THEIR FILE AGAINST OUR RECORD — the one place bricks/CLAUDE.md says a loop
  // could form. After the records, because a model should know what we hold
  // before it asks a person for what they hold.
  registerBringYourDocument(server, env);
  registerBusinessTeardown(server, env);
  registerCompetitorLandscape(server, env);
  registerReviewIntelligence(server, env);
  registerLocalVisibilityAudit(server, env);
  registerPricingBenchmark(server, env);
  registerBrokerDiligencePrep(server, env);
  registerMarketOpportunityScan(server, env);
  registerComposeReport(server, env);
  // THE PAID DOOR, after everything free. A person reads the record for a fee;
  // it sends, so it sits with the other sender and after every tool that answers.
  // THE FREE ALERT, before the paid door — it sends too (a confirmation email),
  // so it sits with the senders, but it costs nothing and the page lists it as
  // a card on `trade`.
  registerWatchTeardowns(server, env);
  registerStartAnEngagement(server, env);
  // LAST, AND THE ONLY ONE THAT IS NOT AN ANSWER. Registration order is tool
  // precedence and this is the tool a model should reach for only after the
  // others have fallen short — a server that offered "tell them what you wish
  // this did" before it offered to do anything is asking for work instead of
  // doing it. It also sends something to a person, which is the one thing on
  // this list a model should never do speculatively.
  registerFeatureRequest(server, env);

  registerPrompts(server);

  return server;
}
