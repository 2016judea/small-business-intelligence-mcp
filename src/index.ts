import {
  createMcpHandler,
  hostHeaderValidationResponse,
  localhostAllowedHostnames,
  localhostAllowedOrigins,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import type { Env } from "./env.js";
import { createServer } from "./server.js";
import { landingPageHtml } from "./pages/landing.js";
import { privacyPageHtml } from "./pages/privacy.js";

const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" } as const;

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(landingPageHtml(), { headers: HTML_HEADERS });
    }

    if (url.pathname === "/privacy") {
      return new Response(privacyPageHtml(), { headers: HTML_HEADERS });
    }

    if (url.pathname === "/mcp") {
      // Per the SDK's own guidance: put Origin/Host validation in front of a
      // bare-mounted handler on a fetch-native runtime. localhost + this
      // Worker's own hostname (workers.dev today, a custom domain later)
      // are allowed; nothing else.
      const rejected =
        hostHeaderValidationResponse(request, [...localhostAllowedHostnames(), url.hostname]) ??
        originValidationResponse(request, [...localhostAllowedOrigins(), `https://${url.hostname}`]);
      if (rejected) return rejected;

      // Built fresh per request so `env` (only available at Workers
      // fetch()-time) closes over every tool handler via createServer(env).
      // See McpServerFactory in ARCHITECTURE.md's "OAuth: stubbed, not
      // mounted" section for why the per-request McpRequestContext arg is
      // otherwise unused here — identity resolution happens per-tool-call
      // inside withPolicy(), not at server construction time.
      const handler = createMcpHandler(() => createServer(env));
      return handler.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
