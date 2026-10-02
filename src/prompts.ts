/**
 * PROMPTS: THE ENTRY POINTS A CLIENT SHOWS BEFORE ANYONE TYPES.
 *
 * Tools wait to be called; prompts are listed in the client's own UI — a slash
 * menu in Claude Desktop, a "+" in others — and are the one surface where this
 * server can suggest a FIRST move rather than answer one. Three, each the
 * opening line of a route that ends on the platform: an address, a role, a
 * deal. Added 2026-10-02 with the platform tools; nothing here holds data, each
 * only tells the model which tools to chain and in what order.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";

const text = (t: string) => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text: t } }] });

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "twin-cities-address",
    {
      title: "Read the record on a Twin Cities address",
      description: "One address in the Minneapolis–St. Paul metro → what the county, the state and the neighbours' files say, then the surrounding market.",
      argsSchema: z.object({ address: z.string().describe("Street address with the city, e.g. '1420 Grand Ave, Saint Paul'") }),
    },
    ({ address }) =>
      text(
        `Read the public record on ${address}.\n\n` +
          "1. Call twin_cities_lookup with the address. Report each field as a value or as the miss with its reason — never fill a miss.\n" +
          "2. Call twin_cities_records for `sales` within 2640 ft of the address, then `owners` for the same address to see what else the owner holds.\n" +
          "3. End with two lines: what the record settles, and what it cannot say (earnings, rent, the owner's intent). " +
          "If I say what I do, call what_we_have_for_you with it — there may be more on the shelf than one address.",
      ),
  );

  server.registerPrompt(
    "what-do-you-have-for-me",
    {
      title: "What Brick & Mortar has for someone like me",
      description: "Say what you do; get the shelf — datasets, tools that read your own file, the lookup, and what a person can do for a fee.",
      argsSchema: z.object({ who: z.string().describe("What you do, in your words — 'I lend SBA 7(a) in the metro', 'I own eleven rental units in Minneapolis'") }),
    },
    ({ who }) =>
      text(
        `I ${who.replace(/^i\s+/i, "")}.\n\n` +
          "Call what_we_have_for_you with `who` set to that sentence; confirm the closest role with me, then call it again with the role id. " +
          "Show me the shelf as a short list grouped by kind — what I can download now, what I can bring a file to, the one-address lookup, and anything a person does for a fee with its price and turnaround as the card states them. " +
          "Do not invent a card, a count or a price; everything comes from the tool result. Then ask which one I want to start with.",
      ),
  );

  server.registerPrompt(
    "diligence-on-a-deal",
    {
      title: "Diligence on a Twin Cities business or building",
      description: "Chain the free record checks on one deal, then the diligence framework, into one report — and name the paid packet only if you want a person to do it.",
      argsSchema: z.object({
        business: z.string().describe("The business or building, as you'd say it"),
        address: z.string().describe("Its street address with the city"),
      }),
    },
    ({ business, address }) =>
      text(
        `I am looking at ${business} at ${address}.\n\n` +
          "1. twin_cities_lookup on the address.\n" +
          "2. twin_cities_records on the address for `licences`, `contamination` and `sales` within 1320 ft, then `owners` for the owner's other holdings.\n" +
          "3. broker_diligence_prep for the business, using what steps 1–2 found as the public-record half.\n" +
          "4. If I have the seller's P&L or the lease, call bring_your_document with tool 'pl' or 'leasecheck' and the text.\n" +
          "5. compose_report for a buyer, citing every file the earlier tools named.\n" +
          "Only if I ask for a person to read the record: start_an_engagement with no arguments first to show the diligence packet's price and turnaround, then file it with my details exactly as I give them.",
      ),
  );
}
