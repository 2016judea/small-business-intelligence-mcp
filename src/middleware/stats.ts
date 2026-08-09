export interface ToolStats {
  recordCall(toolName: string): Promise<void>;
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
 */
export class KVToolStats implements ToolStats {
  constructor(private readonly kv: KVNamespace) {}

  private key(toolName: string, date: string): string {
    return `stats:${toolName}:${date}`;
  }

  async recordCall(toolName: string): Promise<void> {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
    const key = this.key(toolName, date);
    const raw = await this.kv.get(key);
    const next = (raw ? Number.parseInt(raw, 10) : 0) + 1;
    await this.kv.put(key, String(next));
  }
}
