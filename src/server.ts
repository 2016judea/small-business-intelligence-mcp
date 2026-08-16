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

/**
 * Builds one McpServer instance per HTTP request (see src/index.ts —
 * createMcpHandler is constructed fresh per request so `env`, which Workers
 * only hands you at fetch()-time, can close over every tool's handler).
 * All 9 tools are pure functions of their input; nothing here is stateful.
 *
 * ORDER IS DELIBERATE AND IS THE ONLY PLACE TOOL PRECEDENCE IS EXPRESSED. A
 * client shows tools in registration order and a model skims that list, so
 * data_source_atlas is registered FIRST: it is the one tool that changes what
 * the others are worth. Every framework here tells a model how to reason about
 * a business; the atlas tells it where the records actually are, which is the
 * half a capable model does not already know.
 */
export function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: "small-business-intelligence",
    version: "0.1.0",
    title: "Small Business Intelligence by Brick & Mortar",
  });

  registerDataSourceAtlas(server, env);
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
