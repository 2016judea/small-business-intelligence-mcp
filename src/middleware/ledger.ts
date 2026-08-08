export interface UsageLedger {
  increment(identity: string): Promise<number>;
  getCount(identity: string): Promise<number>;
}

// `identity` already bakes in the UTC date (see identity.ts), so a flat TTL
// is all that's needed to let old counters expire — no separate date key.
const TTL_SECONDS = 60 * 60 * 48;

/**
 * KV-backed ledger, free tier. Swappable for Durable Objects/D1 later —
 * nothing outside this file knows the storage is KV, and increment/getCount
 * is a soft, non-atomic counter (fine for a metered *warning*, not a billing
 * system — KV has no atomic increment).
 */
export class KVUsageLedger implements UsageLedger {
  constructor(private readonly kv: KVNamespace) {}

  private key(identity: string): string {
    return `usage:${identity}`;
  }

  async getCount(identity: string): Promise<number> {
    const raw = await this.kv.get(this.key(identity));
    return raw ? Number.parseInt(raw, 10) : 0;
  }

  async increment(identity: string): Promise<number> {
    const next = (await this.getCount(identity)) + 1;
    await this.kv.put(this.key(identity), String(next), { expirationTtl: TTL_SECONDS });
    return next;
  }
}
