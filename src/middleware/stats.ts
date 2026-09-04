import type { ClientClass } from "./client_class.js";

export interface ToolStats {
  recordCall(toolName: string, client: ClientClass): Promise<void>;
}

/**
 * Aggregate, non-identifying tool-usage counter — deliberately separate
 * from UsageLedger (ledger.ts). This is NOT tied to any identity: it never
 * sees an IP, a hash, or anything about who called a tool, only which tool
 * was called and on what UTC date. Disclosed in /privacy and /docs as
 * exactly that.
 *
 * Same KV namespace as the ledger, different key prefix (`stats:` vs
 * `usage:`) — no separate binding needed. Unlike the ledger, entries have
 * no TTL: this is meant to answer "which tools actually get used," which
 * needs history, not a rolling 48h window.
 *
 * KEY SHAPE CHANGED 2026-09-04: `stats:{tool}:{date}` became
 * `stats:{tool}:{date}:{client}` (see client_class.ts). Same write count —
 * one increment per call — the counter is just split by WHO called. Keys
 * written before that date have three parts and scripts/usage_stats.py
 * reads them as client "unknown".
 */
export class KVToolStats implements ToolStats {
  constructor(private readonly kv: KVNamespace) {}

  private key(toolName: string, date: string, client: ClientClass): string {
    return `stats:${toolName}:${date}:${client}`;
  }

  async recordCall(toolName: string, client: ClientClass): Promise<void> {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
    const key = this.key(toolName, date, client);
    const raw = await this.kv.get(key);
    const next = (raw ? Number.parseInt(raw, 10) : 0) + 1;
    await this.kv.put(key, String(next));
  }
}
