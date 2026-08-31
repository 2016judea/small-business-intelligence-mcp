/**
 * THE ONLY TOOL HERE THAT SENDS SOMETHING RATHER THAN ANSWERING SOMETHING.
 *
 * WHY IT EXISTS. Every other tool on this server ends a turn one of two ways: it
 * answers, or it says the record does not reach that. The second ending is a
 * dead end — the person asks their assistant for a dataset we do not hold, gets
 * an honest "not in this corpus", and that is the last anyone here ever hears of
 * it. The single most valuable signal a free, open server produces is a stranger
 * telling us exactly what to go and build, and until this tool it evaporated at
 * the point it was generated. bricks' own enablement layer (`_lib/enablement.js`)
 * was built on precisely this argument for the website's chat; this is the same
 * door, on the surface where the conversation actually happens.
 *
 * IT IS NOT A CONTACT FORM. A contact form collects a string. This collects a
 * diagnosis, because the model on the other end has just watched somebody fail
 * to get an answer and is the best-placed thing in the world to say what they
 * were trying to do. `context` is the model's summary and should be; `request`
 * and `reply_email` are LITERALS and must not be. That split is lifted straight
 * from bricks' api/work-request.js: everything a model files benefits from being
 * a summary except the identifiers, where an address off by a character is a
 * person we can never answer and a paraphrased request is a request for
 * something slightly else. The tool description says so in as many words,
 * because the description is the only place the model reads it.
 *
 * NOTHING IS REQUIRED, ON PURPOSE. `request` is optional in the schema and the
 * handler answers a call without it by asking for it — a friendly, successful
 * result the model relays as a question. A required field would make a client
 * reject the call at the protocol level, which the person never sees and the
 * model has no good recovery from; and the shape it produces is worse, because a
 * model that must have the string before it may call will guess at one. Calling
 * early and being asked is the interaction we want.
 *
 * WHERE IT GOES. brickandmortar.dev/api/mcp-feedback, which files through the
 * same runners as the website's own forms and mails aidan@brickandmortar.dev.
 * This Worker sends no mail itself and holds no mail credential: Workers cannot
 * SMTP, and the alternative was a new account with a mail vendor for a path that
 * already exists one hostname away. The route is token-guarded — see
 * MCP_FEEDBACK_TOKEN in env.ts — because an unauthenticated public MCP server
 * pointed at an open mail endpoint is a spam relay with a language model in
 * front of it.
 *
 * Grounded 2026-08-31.
 */
import { z } from "zod";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { resolveIdentity } from "../middleware/identity.js";
import { NoticeSchema } from "./types.js";

const DEFAULT_ORIGIN = "https://brickandmortar.dev";
const origin = (env: Env) => (env.BRICKS_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");

/**
 * BOUNDS BEFORE ANYTHING LEAVES THIS WORKER, and the receiving route bounds them
 * again. Two bounds rather than one because they defend different things: the
 * far one keeps an unbounded string out of an email, this one keeps this server
 * from being the thing that carries it there. A public tool that forwards
 * arbitrary-length text to an inbox is a mail relay however polite its schema is.
 */
const MAX_REQUEST = 1_200;
const MAX_SHORT = 300;

/**
 * Three filings a day per caller, and the caller is the daily hashed IP from
 * middleware/identity.ts — not a string the client chose, which is the whole
 * point. Somebody hitting a genuine wall files one, maybe two. The fourth is a
 * model looping, and its value is zero while its cost is that the first three
 * stop being read. Same number and same reasoning as bricks' own cap, which
 * applies again on the far side.
 */
const DAILY_FILINGS = 3;
const LEDGER_TTL_SECONDS = 60 * 60 * 48;

const Input = z.object({
  request: z
    .string()
    .optional()
    .describe(
      "The person's own words, VERBATIM — do not summarise, rewrite or tidy them. Omit only if they have not said it yet; you will be asked for it.",
    ),
  kind: z
    .enum(["feature", "data", "correction"])
    .optional()
    .describe(
      "feature = make a tool do something it does not do. data = hold or expose a record we do not. correction = a tool here gave a wrong or misleading answer. Default: feature.",
    ),
  context: z
    .string()
    .optional()
    .describe("Your summary of what they were actually trying to do when they hit this. This one is yours to write."),
  subject: z
    .string()
    .optional()
    .describe("The city, sector, dataset or tool name this is about — 'Duluth', 'dental practices', 'twin_cities_records'."),
  reply_email: z
    .string()
    .optional()
    .describe(
      "Optional, and only if they offer it. VERBATIM — never guess, complete or correct an address. Omit it rather than approximate it.",
    ),
});

const PayloadSchema = z.object({
  tool: z.string(),
  status: z
    .enum(["filed", "needs_more", "not_filed"])
    .describe(
      "`needs_more` means nothing was sent and you should ask the person the question in `message`, then call again. `not_filed` means it failed — do NOT tell them it was submitted.",
    ),
  message: z.string(),
  filed: z.record(z.string(), z.unknown()).optional(),
  notice: NoticeSchema.optional().describe(
    "Present ONLY when the request was denied by usage policy instead of executed. When present, nothing was filed.",
  ),
});

type Payload = z.infer<typeof PayloadSchema>;

const result = (payload: Payload): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  structuredContent: payload,
});

const denial = (message: string, upgrade_url: string): CallToolResult =>
  result({
    tool: "request_a_feature",
    status: "not_filed",
    message: "Not filed — the free daily usage limit was reached before this ran.",
    notice: { status: "usage_limit_reached", message, upgrade_url },
  });

/** The three kinds, mapped onto the three the receiving route already speaks. */
const KIND_TO_ROUTE = { feature: "request", data: "data", correction: "message" } as const;

export function registerFeatureRequest(server: McpServer, env: Env): void {
  server.registerTool(
    "request_a_feature",
    {
      title: "Request a Feature",
      description:
        "Sends a feature request, a data request or a correction straight to the person who builds this server — free, no account, and it reaches a real inbox. Use it whenever this server falls short of what the user actually wanted: a question it cannot answer, a dataset or column it does not hold, a city or sector it does not cover, or an answer from one of these tools that looks wrong. Reaching a wall is not the end of the turn; offer to file it.\n\n" +
        "Before calling, ask for what you do not have — what they were trying to do, which city/sector/dataset it concerns, and whether they want a reply at an email address. Do not demand any of it: file what you have. Pass their REQUEST and their EMAIL exactly as they wrote them, never a paraphrase or a corrected address; write `context` yourself. Tell them what you filed in one line afterwards so they can correct you, and never say it was sent unless `status` came back `filed`.\n\n" +
        "Example invocations:\n" +
        '- "I wish this could tell me the lease rate — can you ask them to add it?"\n' +
        '- "Do they cover Duluth? No? Tell them I want it."\n' +
        '- "That sale price looks like the wrong year — report it to whoever runs this."',
      inputSchema: Input,
      outputSchema: PayloadSchema,
      // NOT read-only, and it is the only tool here that is not: it sends
      // something to a person. `destructiveHint: false` because nothing is
      // overwritten or lost, but a client that hides non-read-only tools behind
      // a confirmation should hide this one.
      annotations: {
        title: "Request a Feature",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    withPolicy(
      "request_a_feature",
      env,
      async (args: z.infer<typeof Input>, ctx) => {
        const request = (args.request ?? "").trim().slice(0, MAX_REQUEST);
        if (!request) {
          return result({
            tool: "request_a_feature",
            status: "needs_more",
            message:
              "Nothing filed yet — I need their own words first. Ask them what they wanted this to do or hold, " +
              "then call again with that sentence as `request`, exactly as they say it.",
          });
        }

        const kind = KIND_TO_ROUTE[args.kind ?? "feature"];

        // The same identity the policy middleware resolved a moment ago — a
        // daily-rotating hash of the caller's IP, recomputed rather than plumbed
        // through so this tool's needs never reshape the seam every other tool
        // passes through. Nothing new is captured here; see middleware/identity.ts.
        const identity = await resolveIdentity(ctx.http?.req);
        const key = `feedback:${identity}`;
        const filedToday = Number.parseInt((await env.USAGE_LEDGER.get(key)) ?? "0", 10) || 0;
        if (filedToday >= DAILY_FILINGS) {
          return result({
            tool: "request_a_feature",
            status: "not_filed",
            message:
              `Not sent — ${DAILY_FILINGS} requests have already been filed from here today. Tell them the earlier ones ` +
              "are already with the team, and that anything more can go to aidan@brickandmortar.dev directly.",
          });
        }

        const token = env.MCP_FEEDBACK_TOKEN;
        if (!token) {
          // Fail loudly rather than silently dropping it. A tool that reports
          // success into an unconfigured pipe is the one failure this whole
          // path is built to avoid.
          console.error("[request_a_feature] MCP_FEEDBACK_TOKEN is not set — nothing can be filed");
          return notFiled();
        }

        let ok = false;
        try {
          const res = await fetch(`${origin(env)}/api/mcp-feedback`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-mcp-token": token,
              "user-agent": "sbi-mcp (+https://brickandmortar.dev)",
            },
            body: JSON.stringify({
              kind,
              text: request,
              context: (args.context ?? "").trim().slice(0, MAX_SHORT) || undefined,
              subject: (args.subject ?? "").trim().slice(0, MAX_SHORT) || undefined,
              email: (args.reply_email ?? "").trim().slice(0, 254) || undefined,
              // What the caller's own client says it is, forwarded so an inbox
              // can tell Claude Desktop from ChatGPT. Already on every request
              // this Worker serves; nothing is being collected that was not.
              client: ctx.http?.req?.headers.get("user-agent") ?? undefined,
              session: identity,
            }),
          });
          ok = res.ok;
          if (!ok) console.error(`[request_a_feature] filing rejected: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
        } catch (err) {
          console.error("[request_a_feature] filing failed:", (err as Error).message);
        }

        if (!ok) return notFiled();

        // Counted only on a send that happened, so a broken pipe never spends
        // somebody's three filings on nothing.
        await env.USAGE_LEDGER.put(key, String(filedToday + 1), { expirationTtl: LEDGER_TTL_SECONDS });

        return result({
          tool: "request_a_feature",
          status: "filed",
          message:
            "Sent — it is now in the inbox of the person who builds this. Tell them it has been filed, repeat in one " +
            "line what you sent so they can correct you, and then carry on with what you can help with. " +
            (args.reply_email
              ? "They left an address, so say somebody will reply to it."
              : "Do not promise them a reply — no address was given."),
          filed: { kind: args.kind ?? "feature", request, subject: args.subject, reply_email: args.reply_email },
        });
      },
      denial,
    ),
  );
}

/** One wording for every way the filing can fail, because the model must relay the same thing. */
const notFiled = (): CallToolResult =>
  result({
    tool: "request_a_feature",
    status: "not_filed",
    message:
      "It could NOT be sent — something broke on our side. Do not tell them it was submitted. Tell them the filing " +
      "failed and that they can email aidan@brickandmortar.dev directly, then carry on helping.",
  });
