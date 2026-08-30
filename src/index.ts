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

    // ── ChatGPT app-directory domain verification ──────────────────────────
    //
    // OpenAI proves you control the host before it will list an app: it issues a
    // token in the submission portal and fetches it back as PLAIN TEXT from
    // /.well-known/openai-apps-challenge. Not JSON, not HTML — a body that is
    // anything else fails the check with no explanation.
    //
    // IT IS FETCHED FROM THE ROOT OF THE HOST, not from beside the MCP path.
    // Developers submitting a server at example.com/api/mcp have the challenge
    // requested at example.com/.well-known/... and fail, which is why this sits
    // in the top-level router rather than under the /mcp handler.
    //
    // The token lives in a secret because it is per-submission and rotating it
    // must not need a code change:  wrangler secret put OPENAI_APPS_CHALLENGE
    // Unset, this 404s exactly as it did before the route existed — an empty
    // 200 would fail verification while looking like it worked.
    if (url.pathname === "/.well-known/openai-apps-challenge") {
      const token = env.OPENAI_APPS_CHALLENGE;
      if (!token) {
        return new Response("no challenge token configured", { status: 404 });
      }
      return new Response(token, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
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
