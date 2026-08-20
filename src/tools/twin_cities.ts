/**
 * THE FIRST TOOLS HERE THAT RETURN DATA RATHER THAN METHODOLOGY.
 *
 * WHY THAT REVERSES A RULE THIS REPO WAS BUILT ON. Aidan, 2026-08-16, standing
 * this server up: *"no remote calls to our servers. Just
 * methodologies/frameworks. Where certain data can be found (like BLS, Census,
 * etc)."* That constraint rested on the thesis that the corpus was the moat and
 * the raw records never left the machine — and he invalidated that thesis the
 * NEXT DAY. bricks/CLAUDE.md, 2026-08-17: *"The join is the moat, and the data
 * ships... the data itself is free to export. This REPLACES 'the exhaust is the
 * moat; the raw corpus never leaves this machine'."*
 *
 * Asked on 2026-08-20 whether the newer decision governs, he confirmed it does.
 * So this file exists, and the nine methodology tools are untouched beside it —
 * the "map for humanity" half of the server is exactly as he left it.
 *
 * WHY IT IS A DISTRIBUTION CHANNEL AND NOT A FEATURE. brickandmortar.dev serves
 * 50 crawlable words from a 481 KB page; the dataset pages built the same day fix
 * search, and this fixes the other half — a person never visits the site at all,
 * they ask their assistant about a Minneapolis address and the warehouse answers
 * inside the tool where their work already happens. `/api/export` is already
 * CORS-open, account-free and rate-limit-free, and its own header invites being
 * *"pulled from a notebook, a script or someone else's page."* This is that.
 *
 * TWO TOOLS, NOT SIX, AND ONE SHARED SCHEMA. `tools/list` was measured at ~47 KB
 * on 2026-08-16, most of it the output schema repeated once per tool, and it sits
 * in a client's context for the whole session whether anything is called or not.
 * Every tool added taxes every conversation. Two cover the ground: one to learn
 * what exists, one to ask a question of it.
 *
 * EVERY ANSWER IS A SAMPLE PLUS A COUNT PLUS A LINK, NEVER A FILE. The endpoint's
 * `format=preview` mode returns `rows.length` and `rows.slice(0, 6)` — a real row
 * count and six example rows. That is deliberate here: `adjacency` as GeoJSON is
 * 55 MB and returning a file through a tool result would blow a context window
 * for one call. The count is the honest answer to "how many"; the six rows show
 * what a row looks like; the `download_url` is how the whole thing is fetched.
 * The tool description says so, so a model does not report six rows as the total.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { CallToolResult } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { NoticeSchema } from "./types.js";

const DEFAULT_ORIGIN = "https://brickandmortar.dev";

/**
 * `src=mcp` ON EVERY LINK THIS SERVER HANDS OUT. bricks' `_lib/export_log.js`
 * writes the download server-side and `api/export.js` resolves the channel from
 * `?src=`, so a file pulled because an assistant recommended it is
 * distinguishable in the log from one taken off the website. Without it this
 * channel would be live and uncountable — the same hole the dataset pages shipped
 * with on 2026-08-20 and were fixed for the same day.
 *
 * Note the preview call itself is NOT logged: `logDownload()` runs after the
 * preview branch returns. Tool CALLS are counted by this server's own KV stats
 * (see middleware/stats.ts), so the two halves are each measured somewhere.
 */
const SRC = "mcp";

const origin = (env: Env) => (env.BRICKS_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");

// ── the shared payload ──────────────────────────────────────────────────────
// Lean on `.describe()` by policy: each one is serialised into tools/list once
// per tool and costs context in every session. Only fields a model would
// misreport without help carry one.
const ColumnSchema = z.object({ key: z.string(), label: z.string() });

export const TwinCitiesPayloadSchema = z.object({
  tool: z.string(),
  subject: z.record(z.string(), z.unknown()).optional(),
  answer: z.string(),
  dataset: z.string().optional(),
  scope_label: z.string().optional(),
  matching_rows: z
    .number()
    .int()
    .optional()
    .describe("The true number of rows that match. `sample` shows at most six of them."),
  columns: z.array(ColumnSchema).optional(),
  sample: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe("At most six example rows. Never report these as the complete result."),
  centre: z.record(z.string(), z.unknown()).nullable().optional(),
  coverage: z
    .array(z.string())
    .optional()
    .describe("The counties this dataset actually holds. Coverage is not uniform across datasets."),
  download_url: z.string().optional().describe("Fetch this for the complete file."),
  // NOT `source`. The preview response carries no source string — checked, it
  // returns ok/dataset/scope/scope_label/centre/rows/columns/preview/spec and
  // nothing else — so reading `body.source` would have put `undefined` in a
  // citation field on every call. The dataset page is the better citation
  // regardless: it holds the agency attribution, the full column list, the
  // counties and the layer's stated limits, all on one URL.
  documented_at: z
    .string()
    .optional()
    .describe("Page documenting this dataset's source, full column list and stated limits."),
  datasets: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        rows: z.number().int(),
        columns: z.array(z.string()),
        scopes: z.array(z.object({ key: z.string(), label: z.string(), rows: z.number().int() })),
        subject: z.string().optional(),
      }),
    )
    .optional(),
  caveats: z.array(z.string()),
  notice: NoticeSchema.optional().describe(
    "Present ONLY when the request was denied by usage policy instead of executed. When present, no other field carries a result.",
  ),
});

export type TwinCitiesPayload = z.infer<typeof TwinCitiesPayloadSchema>;

function result(payload: TwinCitiesPayload): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

/** A denial shaped for THIS schema — see DenialBuilder in middleware/context.ts. */
const denial = (tool: string) => (message: string, upgrade_url: string): CallToolResult =>
  result({
    tool,
    answer: "Not run — the free daily usage limit was reached before this tool executed.",
    caveats: [],
    notice: { status: "usage_limit_reached", message, upgrade_url },
  });

const COVERAGE_CAVEAT =
  "Coverage is not uniform. Across these datasets it runs from one county to all seven, and `coverage` on this result is the list this dataset actually holds — do not generalise one dataset's counties to another.";

const NOT_A_FILE_CAVEAT =
  "`sample` is at most six rows and `matching_rows` is the real total. Fetch `download_url` for the complete file; do not present the sample as the whole answer.";

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "sbi-mcp (+https://brickandmortar.dev)" },
  });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: null, raw: text.slice(0, 400) };
  }
}

// ── tool 1: what is in the warehouse ────────────────────────────────────────
const CatalogueInput = z.object({
  about: z
    .string()
    .optional()
    .describe(
      "Optional plain-words filter — 'sales', 'who owns it', 'contamination'. Matches dataset titles and subjects. Omit to list everything.",
    ),
});

export function registerTwinCitiesCatalogue(server: McpServer, env: Env) {
  server.registerTool(
    "twin_cities_datasets",
    {
      title: "Twin Cities Datasets",
      description:
        "Lists the public-records datasets Brick & Mortar publishes for the seven-county Minneapolis-St. Paul metro, with real row counts, column names, the filtered cuts available, and the counties each one actually covers. Free, no account. Call this FIRST to learn what can be answered, then call twin_cities_records to ask it. These are joined county and federal records — parcels and lot lines, recorded sale prices, owners, rental licences, contamination files, business counts by trade, census tracts.\n\n" +
        "Example invocations:\n" +
        '- "What Twin Cities property data do you have access to?"\n' +
        '- "Is there anything on contamination or storage tanks in Minneapolis?"\n' +
        '- "What columns are in the recorded-sales dataset?"',
      inputSchema: CatalogueInput,
      outputSchema: TwinCitiesPayloadSchema,
      annotations: { title: "Twin Cities Datasets", readOnlyHint: true, openWorldHint: true },
    },
    withPolicy(
      "twin_cities_datasets",
      env,
      async (args: z.infer<typeof CatalogueInput>) => {
        const { status, body } = await getJson(`${origin(env)}/api/export`);
        if (status !== 200 || !body?.datasets) {
          return result({
            tool: "twin_cities_datasets",
            subject: args,
            answer: `The catalogue could not be reached (HTTP ${status}). Nothing is being reported as absent — this is a fetch failure, not an empty warehouse.`,
            caveats: ["Do not conclude a dataset does not exist from this result."],
          });
        }
        const q = (args.about ?? "").trim().toLowerCase();
        const all = body.datasets as any[];
        const hit = q
          ? all.filter((d) =>
              `${d.title} ${d.subject ?? ""} ${d.id}`.toLowerCase().includes(q),
            )
          : all;
        return result({
          tool: "twin_cities_datasets",
          subject: args,
          answer:
            hit.length === 0
              ? `Nothing in the catalogue matches "${args.about}". ${all.length} datasets exist; call again with no filter to see them.`
              : `${hit.length} dataset${hit.length === 1 ? "" : "s"} available, free and without an account. Each row count below is the real number of rows in that file.`,
          datasets: hit.map((d) => ({
            id: d.id,
            title: d.title,
            rows: d.rows,
            columns: d.columns,
            scopes: d.scopes,
            subject: d.subject,
          })),
          caveats: [
            COVERAGE_CAVEAT,
            "Each dataset's own stated limits — what it cannot answer — are at https://brickandmortar.dev/system-card/. Read it before quoting a figure as settled.",
          ],
        });
      },
      denial("twin_cities_datasets"),
    ),
  );
}

// ── tool 2: ask the warehouse a question ────────────────────────────────────
const RecordsInput = z.object({
  dataset: z
    .string()
    .describe("A dataset id from twin_cities_datasets — e.g. 'sales', 'owners', 'adjacency'."),
  scope: z
    .string()
    .optional()
    .describe("A scope key from that dataset's `scopes`. Omit for the dataset's first cut."),
  address: z
    .string()
    .optional()
    .describe(
      "A street address inside the seven-county metro, to answer about ONE property instead of the whole market. Include the city after a comma when the street name is common — 'Grand Ave' exists in several of these cities.",
    ),
  within_ft: z
    .number()
    .int()
    .optional()
    .describe("Radius in feet around `address`. Default 5280 (one mile), capped at 26400."),
  columns: z
    .array(z.string())
    .optional()
    .describe("Column keys to return. Omit for the dataset's default set."),
});

export function registerTwinCitiesRecords(server: McpServer, env: Env) {
  server.registerTool(
    "twin_cities_records",
    {
      title: "Twin Cities Records",
      description:
        "Answers a question about the Minneapolis-St. Paul metro from joined public records — what a property sold for and when, who owns it and what else they hold, what shares its lot line, whether it has a contamination or storage-tank file, who is licensed to trade there, how the neighbourhood's census tract compares. Give an `address` to answer about one property and its surroundings; omit it to ask about the whole market cut. Returns the true matching row count, up to six example rows, and a link to the complete file.\n\n" +
        "Example invocations:\n" +
        '- "What did 1420 Grand Ave, Saint Paul last sell for?"\n' +
        '- "What commercial property sold within half a mile of 2900 Hennepin Ave, Minneapolis?"\n' +
        '- "Does 500 Washington Ave S have a contamination file, and who owns it?"',
      inputSchema: RecordsInput,
      outputSchema: TwinCitiesPayloadSchema,
      annotations: { title: "Twin Cities Records", readOnlyHint: true, openWorldHint: true },
    },
    withPolicy(
      "twin_cities_records",
      env,
      async (args: z.infer<typeof RecordsInput>) => {
        const base = origin(env);
        const p = new URLSearchParams({ dataset: args.dataset, format: "preview" });
        if (args.scope) p.set("scope", args.scope);
        if (args.address) p.set("near", args.address);
        if (args.within_ft) p.set("within", String(args.within_ft));
        if (args.columns?.length) p.set("columns", args.columns.join(","));

        const { status, body } = await getJson(`${base}/api/export?${p}`);

        // DISPATCH ON `body.error`, NOT ON THE STATUS CODE. Written against the
        // status first and it was wrong: the endpoint answers an ambiguous address
        // with **HTTP 300**, not 400, so `status === 400 && error === "ambiguous"`
        // could never fire and every ambiguous address would have fallen through to
        // the generic "request failed" below. Found by calling it, not by reading it.
        //
        // EACH OF THESE IS A DIFFERENT TRUE ANSWER, and the generic one was actively
        // misleading. `no_match` means the address is not in this market at all —
        // telling a model "this does not mean no records exist" there is a plausible
        // wrong answer about our own coverage, which is the failure mode this whole
        // codebase is organised against.
        const err = body?.error as string | undefined;
        if (err === "ambiguous") {
          return result({
            tool: "twin_cities_records",
            subject: args,
            answer: `"${body.query}" is an address in ${body.candidates.length} cities in this metro. Ask which city, then call again with it after a comma — the whole string after the comma is read as the city.`,
            caveats: [`Candidates: ${body.candidates.join(" · ")}`],
          });
        }
        if (err === "no_match") {
          return result({
            tool: "twin_cities_records",
            subject: args,
            answer: `No parcel matches "${args.address}" in this market. Coverage is the seven Minnesota counties of the Minneapolis-St. Paul metro and stops at their edge, so an address outside them has no row here — that is a coverage boundary, not a finding about the property.`,
            caveats: [COVERAGE_CAVEAT],
          });
        }
        if (err === "unparsed") {
          return result({
            tool: "twin_cities_records",
            subject: args,
            answer: `"${args.address}" could not be read as a street address. Give a house number and street, and a city after a comma — "2900 Hennepin Ave, Minneapolis". A street name with no number cannot be located.`,
            caveats: [],
          });
        }
        // THE STREET EXISTS AND THE NUMBER DOES NOT, which is a different fact from
        // both "not in this market" and "we cannot read that". The endpoint writes a
        // better sentence for this than anything worth duplicating here — it names
        // the streets it does carry — so it is relayed rather than re-authored.
        // Enumerated from _lib/locate.js rather than discovered one call at a time:
        // it returns exactly `unparsed`, `no_house_number` and `no_match`, and
        // export.js adds `ambiguous` and `not_locatable`. All five are handled.
        if (err === "no_house_number") {
          return result({
            tool: "twin_cities_records",
            subject: args,
            answer: body.message ?? `No parcel on that street carries that number.`,
            caveats: [],
          });
        }
        if (err === "not_locatable") {
          return result({
            tool: "twin_cities_records",
            subject: args,
            answer: `${body.message ?? `"${args.dataset}" has no place on a row, so it cannot be cut to an address.`} Call it again without \`address\` to get the market-wide cut.`,
            caveats: [],
          });
        }
        if (status !== 200 || !body?.ok) {
          return result({
            tool: "twin_cities_records",
            subject: args,
            answer: `That query was not answered (HTTP ${status}${err ? `: ${err}` : ""}). This is a request failure — it does not mean no records exist.`,
            caveats: [
              "Call twin_cities_datasets to check the dataset id and its scope keys.",
              "Do not report this as 'no records found'.",
            ],
          });
        }

        // The download link for the SAME cut, so what a model cites and what a
        // person fetches cannot be two different queries.
        const file = new URLSearchParams({ dataset: args.dataset, format: "csv", src: SRC });
        if (args.scope) file.set("scope", args.scope);
        if (args.address) file.set("near", args.address);
        if (args.within_ft) file.set("within", String(args.within_ft));
        if (args.columns?.length) file.set("columns", args.columns.join(","));

        const where = body.centre?.label
          ? ` within ${body.centre.within_ft} ft of ${body.centre.label}`
          : "";
        return result({
          tool: "twin_cities_records",
          subject: args,
          answer:
            body.rows === 0
              ? `No rows in ${args.dataset} (${body.scope_label})${where}. For this dataset an absent row means no record of that kind, which is not the same as a finding of none — see the system card.`
              : `${body.rows.toLocaleString("en-US")} row${body.rows === 1 ? "" : "s"} in ${args.dataset} (${body.scope_label})${where}.`,
          dataset: body.dataset,
          scope_label: body.scope_label,
          matching_rows: body.rows,
          columns: body.columns,
          sample: body.preview,
          centre: body.centre ?? null,
          download_url: `${base}/api/export?${file}`,
          documented_at: `${base}/datasets/${args.dataset}/`,
          caveats: [NOT_A_FILE_CAVEAT, COVERAGE_CAVEAT],
        });
      },
      denial("twin_cities_records"),
    ),
  );
}
