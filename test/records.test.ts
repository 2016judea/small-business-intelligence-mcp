/**
 * Pins the two contracts twin_cities_records has with /api/export that a
 * schema cannot: an ambiguous address is relayed as the API's own candidate
 * labels (strings — serve_export.js maps them before answering), and contact
 * columns never leave this surface even when a model asks for them by name.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { callTool, env, fakeFetch, json } from "./harness.js";

test("an ambiguous address relays the API's candidate labels and asks for the city", async () => {
  fakeFetch(() => json({ ok: false, error: "ambiguous", query: "100 Main St", candidates: ["100 Main St, Hopkins", "100 Main St, Stillwater"] }, 300));
  const r = await callTool(env(), "twin_cities_records", { dataset: "sales", address: "100 Main St" });
  assert.equal(r.isError, false, r.text);
  assert.match(r.out.answer, /2 cities/);
  assert.equal(r.out.caveats[0], "Candidates: 100 Main St, Hopkins · 100 Main St, Stillwater");
});

test("contact columns are stripped from the request, the sample and the column list", async () => {
  const calls = fakeFetch(() => json({
    ok: true, dataset: "owners", scope: "all", scope_label: "every owner", rows: 1,
    columns: [{ key: "owner", label: "owner" }, { key: "owner_email", label: "owner email" }],
    preview: [{ owner: "A LLC", owner_email: "a@b.co" }],
  }));
  const r = await callTool(env(), "twin_cities_records", { dataset: "owners", columns: ["owner", "owner_email"] });
  assert.equal(r.isError, false, r.text);
  const sent = new URL(calls[0].url).searchParams.get("columns");
  assert.equal(sent, "owner");
  assert.deepEqual(r.out.sample, [{ owner: "A LLC" }]);
  assert.deepEqual(r.out.columns.map((c: any) => c.key), ["owner"]);
  assert.match(r.out.caveats[0], /owner_email was dropped/);
  assert.ok(!r.out.download_url.includes("owner_email"));
});
