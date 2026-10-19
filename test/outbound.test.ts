/**
 * Every tool that leaves this Worker for brickandmortar.dev must (1) bound the
 * wait — a hung upstream must not hold a tools/call open for the client's whole
 * timeout — and (2) turn a network failure into a tool RESULT that says the
 * records were not reached, never a bare thrown error. Before 2026-10-18 the
 * two Twin Cities tools threw on a rejected fetch, so the client saw
 * `isError: "fetch failed"` with none of the "do not conclude absent" framing,
 * and none of the six outbound fetches carried an AbortSignal.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { callTool, env, fakeFetch, json } from "./harness.js";

const FEED = {
  generated: "x", origin: "https://brickandmortar.dev",
  lookup: { q: "Look up an address", api: "https://brickandmortar.dev/api/lookup", page: "https://brickandmortar.dev/" },
  engagements: [{ id: "site-screen", name: "Site screen", clock: "3 days", price: "$300", roles: ["sba"] }],
  tools: { pl: { q: "Read a P&L", api_tool: true, bring: ["the P&L"], rows: null, roles: ["buyer"] } },
  roles: [{ id: "sba", label: "SBA lender", page: "https://brickandmortar.dev/?role=sba", cards: [] }],
};

const networkDown = () => fakeFetch(() => Promise.reject(new TypeError("fetch failed")));

test("twin_cities_records: a dead upstream is a tool result, not a thrown error", async () => {
  networkDown();
  const r = await callTool(env(), "twin_cities_records", { dataset: "sales" });
  assert.equal(r.isError, false, r.text);
  assert.match(r.out.answer, /not reached|could not be reached/i);
  assert.ok(r.out.caveats.some((c: string) => /do not report this as/i.test(c)));
});

test("twin_cities_datasets: a dead upstream is a tool result, not a thrown error", async () => {
  networkDown();
  const r = await callTool(env(), "twin_cities_datasets", {});
  assert.equal(r.isError, false, r.text);
  assert.match(r.out.answer, /could not be reached/i);
});

test("every outbound fetch carries an AbortSignal (a bounded wait)", async () => {
  const calls = fakeFetch((url) => {
    if (url.endsWith("/connect/roles.json")) return json(FEED);
    if (url.includes("/api/export?")) return json({ ok: true, dataset: "sales", scope: "all", scope_label: "every sale", rows: 1, columns: [{ key: "price", label: "price" }], preview: [{ price: 1 }] });
    if (url.endsWith("/api/export")) return json({ datasets: [] });
    if (url.includes("/api/lookup")) return json({ ok: true, label: "1 Main St", county: "Hennepin", pin: "1", fields: {} });
    if (url.endsWith("/api/tool")) return json({ cells: [] });
    if (url.endsWith("/api/engagement")) return json({ ok: true });
    if (url.endsWith("/api/mcp-feedback")) return json({ ok: true });
    throw new Error("unexpected url " + url);
  });
  const e = env({ MCP_FEEDBACK_TOKEN: "t" });
  await callTool(e, "twin_cities_datasets", {});
  await callTool(e, "twin_cities_records", { dataset: "sales" });
  await callTool(e, "twin_cities_lookup", { address: "1 Main St, Minneapolis" });
  await callTool(e, "what_we_have_for_you", {});
  await callTool(e, "bring_your_document", { tool: "pl", text: "revenue 100" });
  await callTool(e, "start_an_engagement", { engagement: "site-screen", who: "lender", email: "a@b.co", detail: "x" });
  await callTool(e, "request_a_feature", { request: "cover Duluth" });
  const routes = new Set(calls.map((c) => new URL(c.url).pathname));
  assert.ok(routes.size >= 6, `expected the six routes to be hit, saw ${[...routes].join(", ")}`);
  for (const c of calls) {
    assert.ok(c.init?.signal instanceof AbortSignal, `${c.url} was fetched with no AbortSignal`);
  }
});
