import { describe, expect, it, beforeEach } from "vitest";
import {
  checkRateLimit,
  extractClientIp,
  _resetRateLimitForTesting,
} from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    _resetRateLimitForTesting();
  });

  it("allows up to the limit", () => {
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit({ key: "k", limit: 3, windowMs: 1000 });
      expect(r.allowed).toBe(true);
    }
  });

  it("blocks the next request after the limit is hit", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit({ key: "k", limit: 3, windowMs: 1000 });
    }
    const r = checkRateLimit({ key: "k", limit: 3, windowMs: 1000 });
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it("isolates buckets by key", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit({ key: "a", limit: 3, windowMs: 1000 });
    }
    const r = checkRateLimit({ key: "b", limit: 3, windowMs: 1000 });
    expect(r.allowed).toBe(true);
  });

  it("returns remaining count", () => {
    const r1 = checkRateLimit({ key: "k", limit: 5, windowMs: 1000 });
    expect(r1.remaining).toBe(4);
    const r2 = checkRateLimit({ key: "k", limit: 5, windowMs: 1000 });
    expect(r2.remaining).toBe(3);
  });
});

describe("extractClientIp", () => {
  it("reads the first IP from x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
    });
    expect(extractClientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to 'unknown' when header is missing", () => {
    const req = new Request("https://example.com");
    expect(extractClientIp(req)).toBe("unknown");
  });

  it("trims whitespace from the IP", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "  192.168.1.1  " },
    });
    expect(extractClientIp(req)).toBe("192.168.1.1");
  });
});
