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
import { docsPageHtml } from "./pages/docs.js";

// `cache-control` is NOT decoration. Without it these three pages ship with no
// caching directive at all, and the edge is free to serve a stale copy for an
// unbounded time: measured 2026-08-16, immediately after a deploy that changed
// the landing copy, `/` returned the PREVIOUS tagline while `/?cb=<random>`
// returned the new one — same worker, same version, different answer depending
// on whether the URL had been seen before. The /mcp endpoint was correct
// throughout, so the failure is invisible in exactly the way that matters: the
// protocol looks fine and the human-readable documentation is a version behind.
//
// `must-revalidate` with a short max-age rather than `no-store`: these pages are
// cheap and static, so letting the edge hold them briefly is right — it just has
// to ask before reusing anything older than that.
const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "public, max-age=300, must-revalidate",
} as const;

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(landingPageHtml(), { headers: HTML_HEADERS });
    }

    if (url.pathname === "/privacy") {
      return new Response(privacyPageHtml(), { headers: HTML_HEADERS });
    }

    if (url.pathname === "/docs") {
      return new Response(docsPageHtml(), { headers: HTML_HEADERS });
    }

    if (url.pathname === "/favicon.ico") {
      // Some crawlers (directory listings included) check this path
      // directly instead of parsing <link rel="icon"> out of the HTML.
      return Response.redirect("https://brickandmortar.dev/favicon-32.png", 302);
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
