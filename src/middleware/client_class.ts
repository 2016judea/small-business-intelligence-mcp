/**
 * Coarse class of the thing on the other end of a request, read off its
 * User-Agent. A CLASS, never the string: the stats key it feeds is disclosed
 * in /privacy as non-identifying, and eight buckets cannot identify anyone.
 *
 * WHY THIS EXISTS. Measured 2026-09-04: ~2,000 requests a day against /mcp,
 * roughly 80% of them from 25+ MCP registry crawlers and liveness monitors
 * that arrived within hours of the registry listing. The per-tool counter
 * could not tell a ChatGPT user from a scanner exercising a tool once, so
 * "has anyone used it?" had no answer. This is the smallest fix: split the
 * counter by who called.
 *
 * Order matters — the named clients are matched before the crawler regex,
 * because "Claude-User" and "openai-mcp" would otherwise never be reached by
 * anything, and a client string like "mcp-client" must not become a crawler.
 */
export type ClientClass =
  | "claude" // claude.ai / Claude Code connector: UA "Claude-User", Anthropic ASN
  | "openai" // ChatGPT apps client: UA "openai-mcp/x"
  | "gemini"
  | "cursor"
  | "crawler" // registries, censuses, liveness monitors, security scanners
  | "browser" // a person opening the URL in a browser (GET only)
  | "cli" // generic HTTP libraries: node, undici, python-httpx, curl, Go …
  | "unknown";

const CRAWLER =
  /bot|probe|monitor|research|census|crawl|collector|audit|scan|watch|observ|harvest|liveness|opt-out|pricing|spike|grader|scraper|verify|registry|checker|archive|study|sync|spider|index|\+https?:|@/i;

const CLI = /^(node|undici|curl|python-httpx|python-requests|python-urllib|Go-http-client|Deno|Bun|aiohttp|Ruby|GuzzleHttp|lua-resty|Python|Java|okhttp|axios|got)/i;

export function classifyClient(userAgent: string | null | undefined): ClientClass {
  const ua = (userAgent ?? "").trim();
  if (!ua) return "unknown";
  if (/^Claude-User/i.test(ua)) return "claude";
  if (/openai-mcp|ChatGPT/i.test(ua)) return "openai";
  if (/gemini/i.test(ua)) return "gemini";
  if (/cursor/i.test(ua)) return "cursor";
  if (CRAWLER.test(ua)) return "crawler";
  if (/^Mozilla\//i.test(ua)) return "browser";
  if (CLI.test(ua)) return "cli";
  return "unknown";
}
