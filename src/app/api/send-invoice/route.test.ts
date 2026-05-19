import { describe, expect, it, beforeEach, vi } from "vitest";
import { _resetRateLimitForTesting } from "@/lib/rate-limit";

// Mock Resend so tests never hit real email infrastructure.
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: "test-id" }),
    },
  })),
}));

// Mock the React Email template (returns a stub element).
vi.mock("@/components/emails/InvoiceTemplate", () => ({
  default: () => ({ type: "div", props: {}, key: null }),
}));

// Configure env BEFORE the route module loads.
process.env.RESEND_API_KEY = "re_test_key";
process.env.RESEND_FROM_EMAIL = "noreply@vertex-pay.vercel.app";
process.env.NEXT_PUBLIC_SITE_URL = "https://vertex-pay.vercel.app";

// Dynamic import after env is set so the module reads the test config.
const { POST } = await import("./route");

const VALID_BODY = {
  clientEmail: "client@example.com",
  pdfBase64: Buffer.from("hello").toString("base64"),
  invoiceNumber: "INV-001",
  vendorName: "Vertex Test Vendor",
  clientName: "Vertex Test Client",
  total: "100",
  token: "USDC",
  paymentLink: "https://vertex-pay.vercel.app/pay/abc123",
  notes: null,
};

function buildRequest(opts: {
  origin?: string | null;
  referer?: string | null;
  forwardedFor?: string;
  body?: unknown;
}): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (opts.origin) headers["origin"] = opts.origin;
  if (opts.referer) headers["referer"] = opts.referer;
  headers["x-forwarded-for"] = opts.forwardedFor ?? "203.0.113.99";

  return new Request("https://vertex-pay.vercel.app/api/send-invoice", {
    method: "POST",
    headers,
    body: JSON.stringify(opts.body ?? VALID_BODY),
  });
}

describe("/api/send-invoice — security", () => {
  beforeEach(() => {
    _resetRateLimitForTesting();
  });

  it("returns 403 when no Origin or Referer is provided", async () => {
    const res = await POST(buildRequest({}));
    expect(res.status).toBe(403);
  });

  it("returns 403 for a disallowed origin", async () => {
    const res = await POST(buildRequest({ origin: "https://evil.example.com" }));
    expect(res.status).toBe(403);
  });

  it("accepts the canonical site origin", async () => {
    const res = await POST(buildRequest({ origin: "https://vertex-pay.vercel.app" }));
    expect([200, 503]).toContain(res.status); // 200 ok or 503 if Resend env not set in CI
    expect(res.status).not.toBe(403);
  });

  it("accepts localhost origin for dev", async () => {
    const res = await POST(buildRequest({ origin: "http://localhost:3000" }));
    expect(res.status).not.toBe(403);
  });

  it("falls back to Referer when Origin is missing", async () => {
    const res = await POST(
      buildRequest({
        referer: "https://vertex-pay.vercel.app/invoice",
      })
    );
    expect(res.status).not.toBe(403);
  });

  it("returns 429 after exceeding rate limit from same IP", async () => {
    // 5 allowed
    for (let i = 0; i < 5; i++) {
      const res = await POST(
        buildRequest({
          origin: "https://vertex-pay.vercel.app",
          forwardedFor: "198.51.100.7",
        })
      );
      expect(res.status).not.toBe(429);
    }
    // 6th blocked
    const blocked = await POST(
      buildRequest({
        origin: "https://vertex-pay.vercel.app",
        forwardedFor: "198.51.100.7",
      })
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("returns 400 when clientEmail is missing", async () => {
    const { clientEmail: _ignored, ...rest } = VALID_BODY;
    void _ignored;
    const res = await POST(
      buildRequest({
        origin: "https://vertex-pay.vercel.app",
        body: rest,
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.issues).toBeDefined();
  });

  it("returns 400 when clientEmail is malformed", async () => {
    const res = await POST(
      buildRequest({
        origin: "https://vertex-pay.vercel.app",
        body: { ...VALID_BODY, clientEmail: "not-an-email" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when paymentLink is not a URL", async () => {
    const res = await POST(
      buildRequest({
        origin: "https://vertex-pay.vercel.app",
        body: { ...VALID_BODY, paymentLink: "javascript:alert(1)" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("https://vertex-pay.vercel.app/api/send-invoice", {
      method: "POST",
      headers: {
        origin: "https://vertex-pay.vercel.app",
        "x-forwarded-for": "203.0.113.50",
        "content-type": "application/json",
      },
      body: "{not valid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
