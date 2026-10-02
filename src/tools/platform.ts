/**
 * THE PLATFORM, REACHED FROM INSIDE SOMEBODY ELSE'S ASSISTANT.
 *
 * WHAT WAS MISSING. Evaluated 2026-10-02 against brickandmortar.dev: the front
 * door is 18 roles and ~180 cards — 25 datasets, 35 bring-your-own-file tools,
 * a one-address lookup, four priced engagements, an alert — and EVERYTHING FLOWS
 * THROUGH A ROLE (Aidan, 2026-09-30). This server knew the 25 datasets and
 * nothing else. A lender's assistant could reach the sales file and never learn
 * that a site screen exists at a price, that the lender has a shelf, or that a
 * P&L can be read against the record. And the one inbound door, request_a_feature,
 * opens only when the server has FAILED someone — so nobody who was well served
 * ever became a person we could reply to.
 *
 * FOUR TOOLS, ONE FEED. `what_we_have_for_you` is the role picker — the same
 * question the front door asks first. `twin_cities_lookup` is the one-address
 * readout. `bring_your_document` is the moat loop: the file a customer brings,
 * read against the public record, which bricks/CLAUDE.md names as "the one place
 * a loop could form". `start_an_engagement` is the paid door, and the only new
 * tool that sends. All four read `/connect/roles.json`, which
 * scripts/build_mcp_roles.py in bricks writes off the same `roles()` that writes
 * the page — so no price, count or card is typed here. "Every number in
 * customer-facing copy derives from the substrate, never typed."
 *
 * NOTHING IS STORED, on either side, and `bring_your_document` leans on that:
 * /api/tool's own header says "read in the request, answered, and dropped".
 * This Worker holds a document for the length of one fetch.
 */
import { z } from "zod";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import type { Env } from "../env.js";
import { withPolicy } from "../middleware/context.js";
import { resolveIdentity } from "../middleware/identity.js";
import { NoticeSchema } from "./types.js";

const DEFAULT_ORIGIN = "https://brickandmortar.dev";
const origin = (env: Env) => (env.BRICKS_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");
const UA = "sbi-mcp (+https://brickandmortar.dev)";

// ── the feed ────────────────────────────────────────────────────────────────
// One fetch per isolate per ten minutes. The file is ~120 KB and changes once a
// day when refresh_permits.sh rebuilds the page, so a longer TTL would be fine;
// ten minutes keeps a fresh deploy of the page visible here inside a working
// session without anyone remembering to redeploy this Worker.
type Card = {
  i: number;
  kind: string;
  q: string;
  from?: string | null;
  cov?: string | null;
  page: string;
  dataset?: string;
  scope?: string;
  download_url?: string;
  tool?: string | null;
  api_tool?: boolean;
  bring?: string[] | null;
  rows?: string | null;
  engagement?: string;
  price?: string;
  clock?: string;
  href?: string;
  why?: string;
};
type Role = { id: string; label: string; group?: string; sub?: string; page: string; cards: Card[] };
type Engagement = { id: string; name: string; clock: string; price: string; roles: string[] };
type Feed = {
  generated: string;
  origin: string;
  lookup: { q: string; from?: string; cov?: string; api: string; page: string };
  engagements: Engagement[];
  tools: Record<string, { q: string; api_tool: boolean; bring?: string[] | null; rows?: string | null; roles: string[] }>;
  roles: Role[];
};

let cached: { at: number; feed: Feed } | null = null;
const FEED_TTL_MS = 10 * 60 * 1000;

async function feed(env: Env): Promise<Feed | null> {
  if (cached && Date.now() - cached.at < FEED_TTL_MS) return cached.feed;
  try {
    const res = await fetch(`${origin(env)}/connect/roles.json`, { headers: { accept: "application/json", "user-agent": UA } });
    if (!res.ok) return cached?.feed ?? null;
    const f = (await res.json()) as Feed;
    cached = { at: Date.now(), feed: f };
    return f;
  } catch {
    return cached?.feed ?? null;
  }
}

const FEED_DOWN =
  "The platform's role feed could not be read just now. The page itself is at https://brickandmortar.dev — send them there rather than guessing what it holds.";

// ── shared result shape ─────────────────────────────────────────────────────
const PayloadSchema = z.object({
  tool: z.string(),
  status: z.enum(["ok", "needs_more", "filed", "not_filed", "miss", "error"]),
  answer: z.string(),
  subject: z.record(z.string(), z.unknown()).optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  roles: z.array(z.record(z.string(), z.unknown())).optional(),
  cards: z.array(z.record(z.string(), z.unknown())).optional(),
  engagements: z.array(z.record(z.string(), z.unknown())).optional(),
  links: z.record(z.string(), z.string()).optional(),
  next: z.array(z.string()).optional().describe("Which tool on this server answers each kind of card. Follow these rather than improvising."),
  caveats: z.array(z.string()),
  notice: NoticeSchema.optional().describe("Present ONLY when denied by usage policy. Nothing else in the payload is a result."),
});
type Payload = z.infer<typeof PayloadSchema>;

const result = (p: Payload): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(p, null, 2) }],
  structuredContent: p,
});

const denial = (tool: string) => (message: string, upgrade_url: string): CallToolResult =>
  result({ tool, status: "not_filed", answer: "Not run — the free daily usage limit was reached first.", caveats: [], notice: { status: "usage_limit_reached", message, upgrade_url } });

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

// What a card is for, said once. The model reads these instead of guessing
// which of fifteen tools answers a card.
const NEXT = [
  "kind=dataset → twin_cities_records with the card's `dataset` and `scope`, or hand over `download_url` for the whole file.",
  "kind=tool with api_tool=true → bring_your_document with the card's `tool` slug and the text of what `bring` asks for.",
  "kind=tool with api_tool=false → the card runs on the page only; give them `page`.",
  "kind=lookup → twin_cities_lookup with the address.",
  "kind=hire → start_an_engagement; the price and clock are on the card. A person does this work — say so.",
  "kind=alert or kind=link → give them `page`; it is a form or another page.",
];

function compactCard(c: Card) {
  const out: Record<string, unknown> = { kind: c.kind, q: c.q, from: c.from, cov: c.cov, page: c.page };
  if (c.dataset) Object.assign(out, { dataset: c.dataset, scope: c.scope, download_url: c.download_url });
  if (c.kind === "tool") Object.assign(out, { tool: c.tool, api_tool: c.api_tool, bring: c.bring, rows: c.rows });
  if (c.kind === "hire") Object.assign(out, { engagement: c.engagement, price: c.price, clock: c.clock });
  if (c.href) out.href = c.href;
  if (c.why) out.why = c.why;
  return out;
}

const roleSummary = (r: Role) => ({ role: r.id, label: r.label, group: r.group, sub: r.sub, cards: r.cards.length, page: r.page });

// ── tool: what we have for you ──────────────────────────────────────────────
const RoleInput = z.object({
  role: z.string().optional().describe("A role id from the list this tool returns when called with no arguments — e.g. 'sba', 'buyer', 'landlord', 'press'."),
  who: z
    .string()
    .optional()
    .describe("If you do not know the id yet: what the person does, in their words — 'I underwrite restaurants', 'I'm buying a plumbing company'. Returns the closest roles to pick from."),
});

export function registerWhatWeHaveForYou(server: McpServer, env: Env) {
  server.registerTool(
    "what_we_have_for_you",
    {
      title: "What We Have For You",
      description:
        "The front door of brickandmortar.dev, as a tool. The platform is organised by WHO YOU ARE — an SBA lender, a business buyer, a landlord, a contractor, a journalist, a site selector, an appraiser, a city planner, 18 roles — and each role has a shelf of cards: joined public-records datasets for the Minneapolis–St. Paul metro, tools that read a file you bring against those records, a one-address lookup, and fixed-fee engagements where a person reads the record for you. Call with no arguments to see the roles; call with `role` to get that shelf, each card tagged with which tool on this server answers it.\n\n" +
        "Call this FIRST when someone says what they do, or asks what we can do for them. Ask what they do if they have not said — the shelf depends on it. Everything free here is free with no account.\n\n" +
        "Example invocations:\n" +
        '- "I\'m an SBA lender in Minneapolis — what do you have?"\n' +
        '- "What can this do for a landlord?"\n' +
        '- "Show me the shelf for a business buyer."',
      inputSchema: RoleInput,
      outputSchema: PayloadSchema,
      annotations: { title: "What We Have For You", ...RO },
    },
    withPolicy(
      "what_we_have_for_you",
      env,
      async (args: z.infer<typeof RoleInput>) => {
        const f = await feed(env);
        if (!f) return result({ tool: "what_we_have_for_you", status: "error", answer: FEED_DOWN, caveats: [] });

        const want = (args.role ?? "").trim().toLowerCase();
        const role = want ? f.roles.find((r) => r.id === want || r.label.toLowerCase() === want) : undefined;

        if (role) {
          const eng = f.engagements.filter((e) => e.roles.includes(role.id));
          return result({
            tool: "what_we_have_for_you",
            status: "ok",
            answer: `${role.label} — ${role.sub ?? ""}. ${role.cards.length} cards on this shelf${eng.length ? `, ${eng.length} of them engagement${eng.length === 1 ? "" : "s"} a person delivers` : ""}. Page: ${role.page}`,
            subject: { role: role.id, label: role.label },
            cards: role.cards.map(compactCard),
            engagements: eng,
            links: { page: role.page, lookup_api: f.lookup.api },
            next: NEXT,
            caveats: [
              "Coverage is not uniform: a card's `cov` line says which counties or years it actually holds. Do not generalise one card's coverage to another.",
              "Datasets and tools are free with no account. Only kind=hire cards cost money, and a person does that work — nothing is quoted or scheduled by this server.",
            ],
          });
        }

        const who = (args.who ?? want).trim().toLowerCase();
        const scored = who
          ? f.roles
              .map((r) => {
                const hay = `${r.label} ${r.sub ?? ""} ${r.group ?? ""} ${r.id}`.toLowerCase();
                const hits = who.split(/[^a-z]+/).filter((w) => w.length > 2 && hay.includes(w)).length;
                return { r, hits };
              })
              .filter((x) => x.hits > 0)
              .sort((a, b) => b.hits - a.hits)
              .slice(0, 4)
              .map((x) => x.r)
          : [];

        return result({
          tool: "what_we_have_for_you",
          status: want || who ? "needs_more" : "ok",
          answer:
            want && !role
              ? `No role called '${want}'. Pick one of the ${f.roles.length} below and call again with its id.`
              : who
                ? scored.length
                  ? `Closest roles to "${args.who}": ${scored.map((r) => `${r.label} (${r.id})`).join(", ")}. Confirm one with them and call again with \`role\`.`
                  : `Nothing matched "${args.who}" by name. Show them the ${f.roles.length} roles below and ask which is closest.`
                : `${f.roles.length} roles. Ask what the person does, pick the role, call again with its id. The one-address lookup (${f.lookup.q.toLowerCase()}) is on every shelf and needs no role.`,
          roles: (scored.length ? scored : f.roles).map(roleSummary),
          engagements: f.engagements,
          links: { page: `${f.origin}/?src=mcp`, lookup_api: f.lookup.api },
          next: NEXT,
          caveats: ["Minneapolis–St. Paul only: the seven-county metro. For another place, data_source_atlas tells you where the record lives; we do not hold it."],
        });
      },
      denial("what_we_have_for_you"),
    ),
  );
}

// ── tool: one address ───────────────────────────────────────────────────────
const LookupInput = z.object({
  address: z.string().describe("A street address in the seven-county Minneapolis–St. Paul metro. Include the city — 'Grand Ave' exists in several of them."),
});

export function registerTwinCitiesLookup(server: McpServer, env: Env) {
  server.registerTool(
    "twin_cities_lookup",
    {
      title: "Twin Cities Lookup",
      description:
        "One address in the Minneapolis–St. Paul metro → what the public record says about that parcel, in one call: land use, build year, assessed value, last recorded sale, any MPCA contamination or storage-tank file, and the parcels that touch it with how many owners they have. Each field is a value or a miss WITH ITS REASON — 'the county records no build year' — never a blank. Free, no account, nothing stored. Use it the moment an address comes up; then twin_cities_records for the surrounding market.\n\n" +
        "Example invocations:\n" +
        '- "What do you know about 1420 Grand Ave, Saint Paul?"\n' +
        '- "Is there anything on file for the building at 2900 Lyndale Ave S?"',
      inputSchema: LookupInput,
      outputSchema: PayloadSchema,
      annotations: { title: "Twin Cities Lookup", ...RO },
    },
    withPolicy(
      "twin_cities_lookup",
      env,
      async (args: z.infer<typeof LookupInput>) => {
        const q = args.address.trim();
        const base = origin(env);
        const page = `${base}/?q=${encodeURIComponent(q)}&src=mcp`;
        let body: any = null;
        try {
          const res = await fetch(`${base}/api/lookup?q=${encodeURIComponent(q)}`, { headers: { accept: "application/json", "user-agent": UA } });
          body = await res.json();
        } catch {
          return result({ tool: "twin_cities_lookup", status: "error", answer: "The lookup could not be reached. Nothing was stored; try once more, or send them to the page.", subject: { address: q }, links: { page }, caveats: [] });
        }
        if (!body?.ok) {
          return result({
            tool: "twin_cities_lookup",
            status: "miss",
            answer: String(body?.message ?? "No parcel in the commercial index matched that address."),
            subject: { address: q, status: body?.status },
            links: { page },
            caveats: ["A miss here means the address did not resolve in the commercial parcel index for the seven counties — it is not a finding about the property."],
          });
        }
        const fields: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(body.fields ?? {})) {
          const f = v as { value?: string; miss?: string; note?: string | null; hot?: boolean };
          fields[k] = f.value != null ? { value: f.value, ...(f.note ? { note: f.note } : {}), ...(f.hot ? { flag: true } : {}) } : { miss: f.miss };
        }
        const hits = Object.values(fields).filter((f: any) => f.value != null).length;
        return result({
          tool: "twin_cities_lookup",
          status: "ok",
          answer: `${body.label}${body.county ? `, ${body.county} County` : ""}${body.pin ? ` (parcel ${body.pin})` : ""}: ${hits} of ${Object.keys(fields).length} fields on file. Read the misses — each says why.`,
          subject: { address: q, label: body.label, county: body.county, pin: body.pin },
          result: fields,
          links: { page },
          next: ["twin_cities_records with the same address for sales, owners, licences or contamination within a radius.", "what_we_have_for_you if they say what they do — the shelf is wider than one address."],
          caveats: [
            "Six fields, one parcel. 'No MPCA file' is not a clean bill — the state searches what it is told about.",
            "A portfolio deed records one price on every parcel it carried; the sale field says so when that is the case.",
          ],
        });
      },
      denial("twin_cities_lookup"),
    ),
  );
}

// ── tool: bring your document ───────────────────────────────────────────────
const MAX_DOC = 400_000;
const DocInput = z.object({
  tool: z.string().describe("A tool slug from a what_we_have_for_you card where api_tool is true — e.g. 'pl', 'leasecheck', 'compgrade', 'claim-check', 'registercheck'."),
  text: z
    .string()
    .optional()
    .describe("The document as plain text — a pasted P&L, a lease, a list of addresses one per line, a comp table. Their content, untouched. For 'claim-check' use `claim` instead."),
  claim: z.string().optional().describe("For tool 'claim-check' only: the one sentence to check against the record, exactly as written."),
  context: z
    .object({
      subjectAddress: z.string().optional().describe("The property or business address the document is about, when the tool's `bring` list asks for one."),
      radiusFeet: z.number().int().optional(),
      fromMonth: z.string().optional().describe("YYYY-MM, for tools that ask 'since when'."),
    })
    .optional(),
});

export function registerBringYourDocument(server: McpServer, env: Env) {
  server.registerTool(
    "bring_your_document",
    {
      title: "Bring Your Document",
      description:
        "Reads a document the person has — a P&L, a lease, a comp set, a schedule of locations, a member list, a story's addresses, a single claim — against the Minneapolis–St. Paul public record, and returns a table that cites the file behind every cell. This is the half of the platform the public record cannot do alone: their private file, our joined records, one answer. Free, no account. The document is read in the request, answered, and dropped — nothing is stored on either side.\n\n" +
        "Get the slug and what to bring from what_we_have_for_you (cards with api_tool=true list `bring`). Pass the text exactly as they gave it; do not summarise a P&L before sending it. Tell them in one line what was sent and that it was not kept.\n\n" +
        "Example invocations:\n" +
        '- "Here\'s the P&L the seller sent — what does this business actually earn?" → tool \'pl\'\n' +
        '- "Grade my comps against the county\'s own sales" → tool \'compgrade\'\n' +
        '- "Check this line in my story: \'the building sold for $4.2M in March\'" → tool \'claim-check\', `claim`',
      inputSchema: DocInput,
      outputSchema: PayloadSchema,
      // Read-only on OUR side: /api/tool stores nothing and nothing is sent to a
      // person. Open-world because it reaches a service.
      annotations: { title: "Bring Your Document", ...RO, idempotentHint: false },
    },
    withPolicy(
      "bring_your_document",
      env,
      async (args: z.infer<typeof DocInput>) => {
        const f = await feed(env);
        const slug = args.tool.trim();
        const live = f ? Object.entries(f.tools).filter(([, t]) => t.api_tool) : [];
        const known = live.find(([s]) => s === slug);
        if (f && !known) {
          return result({
            tool: "bring_your_document",
            status: "needs_more",
            answer: `'${slug}' is not a tool that takes a document over the API. The ones that do are listed in \`cards\`; pick by what they want answered.`,
            cards: live.map(([s, t]) => ({ tool: s, q: t.q, bring: t.bring, roles: t.roles })),
            caveats: [],
          });
        }
        const text = (args.text ?? "").slice(0, MAX_DOC);
        const claim = (args.claim ?? "").trim();
        if (!text && !claim) {
          return result({
            tool: "bring_your_document",
            status: "needs_more",
            answer: `Nothing to read. ${known ? `'${slug}' asks for: ${(known[1].bring ?? []).join("; ")}.` : ""} Ask for the document as text, then call again.`,
            caveats: [],
          });
        }
        const payload: Record<string, unknown> = { tool: slug, context: args.context ?? {} };
        if (claim) payload.claim = claim;
        if (text) payload.document = { type: "text", text };
        let status = 0;
        let body: any = null;
        try {
          const res = await fetch(`${origin(env)}/api/tool`, {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json", "user-agent": UA },
            body: JSON.stringify(payload),
          });
          status = res.status;
          body = await res.json().catch(() => null);
        } catch {
          return result({ tool: "bring_your_document", status: "error", answer: "The tool could not be reached. Nothing was stored; try once more.", subject: { tool: slug }, caveats: [] });
        }
        if (status !== 200) {
          return result({
            tool: "bring_your_document",
            status: status === 400 ? "needs_more" : "error",
            answer: String(body?.error ?? `The tool answered HTTP ${status}.`) + (status === 400 ? " That is about the document — relay it to the person." : " That is on our side, not theirs."),
            subject: { tool: slug },
            caveats: [],
          });
        }
        return result({
          tool: "bring_your_document",
          status: "ok",
          answer: `${known ? known[1].q : slug}: answered. Every cell that cites a file names the public record it came from; cells marked derived were computed here. The document was not kept.`,
          subject: { tool: slug, chars: text.length || claim.length },
          result: body ?? {},
          caveats: [
            "Figures the tool reports back from the document are checked against the document's own text where that text was available; a cell that says the check could not run means exactly that.",
            "No public record holds a private company's earnings, rent or payroll — what the record contributes is the comparison, not the figure.",
          ],
        });
      },
      denial("bring_your_document"),
    ),
  );
}

// ── tool: start an engagement ───────────────────────────────────────────────
const DAILY_ENQUIRIES = 3;
const LEDGER_TTL_SECONDS = 60 * 60 * 48;
const EngInput = z.object({
  engagement: z.string().optional().describe("An engagement id from the list this tool returns when called empty — e.g. 'site-screen', 'diligence', 'register-check', 'route'."),
  who: z.string().optional().describe("What the person does, in their words. Required to file — it decides which records a person pulls."),
  email: z.string().optional().describe("Where a person should reply. VERBATIM — never guess, complete or correct an address. Required to file."),
  detail: z.string().optional().describe("The site, deal, portfolio or route in their own words — addresses, the deadline, what they need to know. VERBATIM."),
});

export function registerStartAnEngagement(server: McpServer, env: Env) {
  server.registerTool(
    "start_an_engagement",
    {
      title: "Start an Engagement",
      description:
        "Asks a person at Brick & Mortar to read the public record for them, for a fixed fee: a site screen for a lender or environmental consultant, a diligence packet on a deal, a register check across a landlord's portfolio, a weekly work route for a contractor. Call with no arguments to see the engagements, their prices and turnaround — those come from the live page, never from memory. Call with `engagement`, `who`, `email` and `detail` to file the enquiry; a person replies by email. Nothing is quoted, charged or scheduled here.\n\n" +
        "Offer this only after the free tools have been tried or when the person asks for someone to do the work. Before filing, confirm with them what will be sent. Pass their EMAIL and DETAIL exactly as written. Never say it was sent unless `status` is `filed`.\n\n" +
        "Example invocations:\n" +
        '- "Can someone there just run this site for me? I\'m an SBA lender."\n' +
        '- "I want the diligence packet on this deal — here\'s my email."',
      inputSchema: EngInput,
      outputSchema: PayloadSchema,
      // Sends to a person; a delivered email cannot be recalled. Same annotation
      // and same reasoning as request_a_feature.
      annotations: { title: "Start an Engagement", readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    withPolicy(
      "start_an_engagement",
      env,
      async (args: z.infer<typeof EngInput>, ctx) => {
        const f = await feed(env);
        if (!f) return result({ tool: "start_an_engagement", status: "error", answer: FEED_DOWN, caveats: [] });

        const id = (args.engagement ?? "").trim().toLowerCase();
        const eng = f.engagements.find((e) => e.id === id);
        const who = (args.who ?? "").trim().slice(0, 200);
        const email = (args.email ?? "").trim().slice(0, 254);
        const detail = (args.detail ?? "").trim().slice(0, 2000);

        const missing: string[] = [];
        if (!eng) missing.push("`engagement` (one of the ids below)");
        if (!who) missing.push("`who` — what they do");
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) missing.push("`email` — a reply address, exactly as they wrote it");
        if (missing.length) {
          return result({
            tool: "start_an_engagement",
            status: "needs_more",
            answer: `Nothing filed. Still needed: ${missing.join("; ")}. ${!eng ? "The engagements, with their prices and turnaround, are in `engagements`." : ""}`.trim(),
            engagements: f.engagements.map((e) => ({ ...e, page: `${f.origin}/?role=${e.roles[0]}&src=mcp` })),
            caveats: ["Prices and turnaround are the page's own, read live. A person replies; this server quotes and schedules nothing."],
          });
        }

        const identity = await resolveIdentity(ctx.http?.req);
        const key = `engage:${identity}`;
        const today = Number.parseInt((await env.USAGE_LEDGER.get(key)) ?? "0", 10) || 0;
        if (today >= DAILY_ENQUIRIES) {
          return result({ tool: "start_an_engagement", status: "not_filed", answer: `Not sent — ${DAILY_ENQUIRIES} enquiries have already gone from here today. The earlier ones are with the team; anything more can go to aidan@brickandmortar.dev directly.`, caveats: [] });
        }

        let ok = false;
        let err = "";
        try {
          const res = await fetch(`${origin(env)}/api/engagement`, {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json", "user-agent": UA },
            body: JSON.stringify({ engagement: `${eng!.name} (${eng!.id}) — ${eng!.price}`, who, email, detail, page: "mcp" }),
          });
          ok = res.ok;
          if (!ok) {
            const b = (await res.json().catch(() => ({}))) as { error?: string };
            err = String(b?.error ?? `HTTP ${res.status}`);
          }
        } catch (e) {
          err = (e as Error).message;
        }
        if (!ok) {
          return result({ tool: "start_an_engagement", status: "not_filed", answer: `Not sent: ${err}. Tell them it did not go through and that aidan@brickandmortar.dev reaches the same person.`, caveats: [] });
        }
        await env.USAGE_LEDGER.put(key, String(today + 1), { expirationTtl: LEDGER_TTL_SECONDS });
        return result({
          tool: "start_an_engagement",
          status: "filed",
          answer: `Filed: ${eng!.name} (${eng!.price}, ${eng!.clock}) for ${who}, reply to ${email}. A person reads it and replies by email — nothing is charged until they have agreed scope with you.`,
          subject: { engagement: eng!.id, who, email },
          caveats: ["Tell them what was filed in one line so they can correct it."],
        });
      },
      denial("start_an_engagement"),
    ),
  );
}
