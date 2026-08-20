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
  "twin_cities_datasets",
  "twin_cities_records",
  "business_teardown",
  "competitor_landscape",
  "review_intelligence",
  "local_visibility_audit",
  "pricing_benchmark",
  "broker_diligence_prep",
  "market_opportunity_scan",
  "compose_report",
] as const;

export const TOOL_COUNT = TOOL_NAMES.length;

export function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: "small-business-intelligence",
    version: "0.1.0",
    title: "Small Business Intelligence by Brick & Mortar",
  });

  registerDataSourceAtlas(server, env);
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
  registerBusinessTeardown(server, env);
  registerCompetitorLandscape(server, env);
  registerReviewIntelligence(server, env);
  registerLocalVisibilityAudit(server, env);
  registerPricingBenchmark(server, env);
  registerBrokerDiligencePrep(server, env);
  registerMarketOpportunityScan(server, env);
  registerComposeReport(server, env);

  return server;
}
