// Bundles test/*.test.ts with esbuild (so `./x.js` → `x.ts` resolves the way tsc
// and wrangler resolve it) and runs them under node:test. No network, no KV, no
// wrangler: the Worker's `fetch` export is driven with plain Request objects.
//   npm test
import { build } from "esbuild";
import { readdirSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".test-build");
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
const entries = readdirSync(path.join(root, "test")).filter((f) => f.endsWith(".test.ts")).map((f) => path.join(root, "test", f));
await build({
  entryPoints: entries,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outdir: out,
  outExtension: { ".js": ".mjs" },
  conditions: ["workerd", "worker", "import"],
  external: ["node:*", "cloudflare:*"],
  logLevel: "error",
});
const r = spawnSync(process.execPath, ["--test", ...readdirSync(out).filter((f) => f.endsWith(".mjs")).map((f) => path.join(out, f))], { stdio: "inherit" });
process.exit(r.status ?? 1);
