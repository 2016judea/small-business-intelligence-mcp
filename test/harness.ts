/**
 * Drives the shipped Worker (src/index.ts `fetch`) with JSON-RPC over plain
 * Request objects. KV is an in-memory Map; outbound `fetch` is whatever the
 * test installs on globalThis — so no test here can reach brickandmortar.dev.
 */
import worker from "../src/index.js";
import type { Env } from "../src/env.js";

export function memoryKV(): KVNamespace & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => { store.set(k, v); },
  } as unknown as KVNamespace & { store: Map<string, string> };
}

export function env(extra: Partial<Env> = {}): Env {
  return { USAGE_LEDGER: memoryKV(), POLICY_MODE: "allow_all", ...extra };
}

/** Install a fake outbound fetch; returns the list of URLs/inits it saw. */
export function fakeFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
  return calls;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let nextId = 1;
export async function rpc(e: Env, method: string, params: unknown = {}, headers: Record<string, string> = {}) {
  const req = new Request("https://sbi-mcp.test/mcp", {
    method: "POST",
    headers: { host: "sbi-mcp.test", "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  const res = await worker.fetch(req, e, {} as ExecutionContext);
  const text = await res.text();
  const ct = res.headers.get("content-type") ?? "";
  let msg: any;
  if (ct.includes("text/event-stream")) {
    const data = text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
    msg = JSON.parse(data[data.length - 1]);
  } else {
    msg = JSON.parse(text);
  }
  return { status: res.status, msg };
}

/** tools/call → the parsed structuredContent (or the isError text). */
export async function callTool(e: Env, name: string, args: Record<string, unknown>, headers?: Record<string, string>) {
  const { msg } = await rpc(e, "tools/call", { name, arguments: args }, headers);
  if (msg.error) return { rpcError: msg.error };
  const r = msg.result;
  return { isError: !!r.isError, text: r.content?.[0]?.text as string | undefined, out: r.structuredContent as any };
}
