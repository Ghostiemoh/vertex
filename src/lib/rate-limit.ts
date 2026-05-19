// Sliding-window rate limiter (per serverless instance).
// Memory resets on cold start; acceptable for Phase 1 traffic. For distributed
// limiting across all Vercel instances, swap the backing store for Upstash Redis.

const buckets = new Map<string, number[]>();

export interface RateLimitOptions {
  /** Bucket identifier — typically `${routeName}:${ip}`. */
  key: string;
  /** Maximum requests allowed within `windowMs`. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (hits.length >= limit) {
    const oldest = hits[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    };
  }

  hits.push(now);
  buckets.set(key, hits);
  return {
    allowed: true,
    remaining: Math.max(0, limit - hits.length),
    retryAfterMs: 0,
  };
}

export function extractClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// Test-only escape hatch — never call from production code paths.
export function _resetRateLimitForTesting(): void {
  buckets.clear();
}
