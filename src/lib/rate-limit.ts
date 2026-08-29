import "server-only";

/**
 * In-process sliding-window limiter.
 *
 * Deliberately simple: it protects a single instance and needs no extra
 * infrastructure. Behind more than one instance, swap the `hits` map for Redis
 * — the exported surface is designed so only this file changes. Auth-specific
 * lockout is *also* persisted to `login_attempts`, so brute force is still
 * throttled across instances even before that swap happens.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

/** Drops idle buckets so a long-running process cannot grow without bound. */
function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;

  for (const [key, bucket] of buckets) {
    const alive = bucket.timestamps.filter((t) => now - t < windowMs);
    if (alive.length === 0) buckets.delete(key);
    else bucket.timestamps = alive;
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  limit: number;
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  sweep(windowMs);

  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  const recent = bucket.timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    const oldest = recent[0] ?? now;
    buckets.set(key, { timestamps: recent });
    return {
      ok: false,
      remaining: 0,
      limit,
      retryAfterMs: Math.max(0, windowMs - (now - oldest)),
    };
  }

  recent.push(now);
  buckets.set(key, { timestamps: recent });

  return {
    ok: true,
    remaining: limit - recent.length,
    limit,
    retryAfterMs: 0,
  };
}

/** Named policies, so limits live in one place instead of scattered literals. */
export const LIMITS = {
  login: { limit: 8, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  contact: { limit: 4, windowMs: 60 * 60_000 },
  deposit: { limit: 12, windowMs: 60 * 60_000 },
  withdrawal: { limit: 6, windowMs: 60 * 60_000 },
  marketApi: { limit: 60, windowMs: 60_000 },
  passwordChange: { limit: 5, windowMs: 60 * 60_000 },
} as const;

export function checkLimit(
  policy: keyof typeof LIMITS,
  identifier: string,
): RateLimitResult {
  const { limit, windowMs } = LIMITS[policy];
  return rateLimit(`${policy}:${identifier}`, limit, windowMs);
}

export function retryAfterMessage(result: RateLimitResult): string {
  const minutes = Math.ceil(result.retryAfterMs / 60_000);
  if (minutes <= 1) return "Too many attempts. Try again in a minute.";
  return `Too many attempts. Try again in ${minutes} minutes.`;
}
