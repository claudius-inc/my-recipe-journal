/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Keyed by an arbitrary string (use a per-user key for authenticated routes).
 * In-memory state is per server instance — fine for a single-instance/PWA
 * deployment; swap for Redis/Turso if horizontally scaled.
 */

interface Bucket {
  count: number;
  resetTime: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets (for Retry-After), 0 when allowed. */
  retryAfter: number;
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetTime) {
    buckets.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: max - 1, retryAfter: 0 };
  }

  if (bucket.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetTime - now) / 1000),
    };
  }

  bucket.count++;
  return { allowed: true, remaining: max - bucket.count, retryAfter: 0 };
}

export const HOUR_MS = 60 * 60 * 1000;
