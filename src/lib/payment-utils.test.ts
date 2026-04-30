import { describe, expect, it } from "vitest";
import {
  calculatePaymentBreakdown,
  decodePaymentRequest,
  encodePaymentRequest,
  getTokenMint,
} from "@/lib/payment-utils";
import { getCanonicalUrl } from "@/lib/utils";

describe("payment-utils", () => {
  it("encodes and decodes payment requests", () => {
    const encoded = encodePaymentRequest({
      recipient: "43zpDV5PK347E2gqzpv2LJdDRoCwbv2deCBFcRDysFXG",
      amount: 1.25,
      token: "USDC",
      description: "Retainer",
      memo: "Vertex-INV:1234",
      network: "mainnet-beta",
    });

    const decoded = decodePaymentRequest(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.amount).toBe(1.25);
    expect(decoded?.token).toBe("USDC");
    expect(decoded?.network).toBe("mainnet-beta");
  });

  it("calculates fee breakdowns deterministically", () => {
    const breakdown = calculatePaymentBreakdown(100);
    expect(breakdown.recipientAmount).toBe(100);
    expect(breakdown.platformFee).toBe(0.5);
    expect(breakdown.totalAmount).toBe(100.5);
  });

  it("selects the correct token mint by cluster", () => {
    expect(getTokenMint("USDC", "devnet").toBase58()).toBe(
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
    );
    expect(getTokenMint("USDT", "mainnet").toBase58()).toBe(
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
    );
  });

  it("builds canonical URLs from the configured site URL", () => {
    expect(getCanonicalUrl("/pay/test")).toContain("/pay/test");
    expect(getCanonicalUrl("/verify")).toMatch(/^https:\/\/.+\/verify$/);
  });
});
