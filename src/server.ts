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

/**
 * Builds one McpServer instance per HTTP request (see src/index.ts —
 * createMcpHandler is constructed fresh per request so `env`, which Workers
 * only hands you at fetch()-time, can close over every tool's handler).
 * All 8 tools are pure functions of their input; nothing here is stateful.
 */
export function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: "small-business-intelligence",
    version: "0.1.0",
    title: "Small Business Intelligence by Brick & Mortar",
  });

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
