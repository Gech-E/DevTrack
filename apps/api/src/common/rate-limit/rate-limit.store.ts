export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

type Entry = { count: number; resetAt: number };

const SWEEP_THRESHOLD = 5_000;

/**
 * Fixed-window counter held in process memory.
 *
 * Good enough for a single API instance. When the API is scaled horizontally, each instance
 * counts independently, so swap this for a shared store (for example Redis) behind the same
 * `hit` signature.
 */
export class RateLimitStore {
  private readonly entries = new Map<string, Entry>();

  hit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
    if (this.entries.size >= SWEEP_THRESHOLD) {
      this.sweep(now);
    }

    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      this.entries.set(key, entry);
    }

    entry.count += 1;
    const allowed = entry.count <= limit;

    return {
      allowed,
      limit,
      remaining: Math.max(0, limit - entry.count),
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  get size(): number {
    return this.entries.size;
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}
