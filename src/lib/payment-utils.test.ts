import { describe, expect, it } from "vitest";
import {
  calculatePaymentBreakdown,
  decodePaymentRequest,
  encodePaymentRequest,
  getTokenDecimals,
  getTokenMint,
  isValidSolanaAddress,
} from "@/lib/payment-utils";
import { getCanonicalUrl } from "@/lib/utils";

const VALID_RECIPIENT = "43zpDV5PK347E2gqzpv2LJdDRoCwbv2deCBFcRDysFXG";
const SIG_REGEX = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;

describe("payment encoding", () => {
  it("encodes and decodes a full payment request", () => {
    const encoded = encodePaymentRequest({
      recipient: VALID_RECIPIENT,
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
    expect(decoded?.memo).toBe("Vertex-INV:1234");
    expect(decoded?.id).toBe(encoded);
  });

  it("returns null for an empty string", () => {
    expect(decodePaymentRequest("")).toBeNull();
  });

  it("returns null for a non-base64 garbage string", () => {
    expect(decodePaymentRequest("not-valid-base64!!!")).toBeNull();
  });

  it("returns null when version is wrong", () => {
    const encoded = encodePaymentRequest({
      recipient: VALID_RECIPIENT,
      amount: 1,
      token: "SOL",
      network: "devnet",
    });
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const obj = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
    obj.version = 2;
    const tampered = Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodePaymentRequest(tampered)).toBeNull();
  });

  it("returns null when recipient is an invalid Solana address", () => {
    const encoded = encodePaymentRequest({
      recipient: VALID_RECIPIENT,
      amount: 1,
      token: "SOL",
      network: "devnet",
    });
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const obj = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
    obj.recipient = "not-a-wallet";
    const tampered = Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodePaymentRequest(tampered)).toBeNull();
  });

  it("returns null when amount is zero", () => {
    const encoded = encodePaymentRequest({
      recipient: VALID_RECIPIENT,
      amount: 1,
      token: "SOL",
      network: "devnet",
    });
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const obj = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
    obj.amount = 0;
    const tampered = Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodePaymentRequest(tampered)).toBeNull();
  });

  it("returns null for an unknown token type", () => {
    const encoded = encodePaymentRequest({
      recipient: VALID_RECIPIENT,
      amount: 1,
      token: "SOL",
      network: "devnet",
    });
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const obj = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
    obj.token = "BONK";
    const tampered = Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodePaymentRequest(tampered)).toBeNull();
  });

  it("returns null for an invalid network value", () => {
    const encoded = encodePaymentRequest({
      recipient: VALID_RECIPIENT,
      amount: 1,
      token: "SOL",
      network: "devnet",
    });
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const obj = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
    obj.network = "testnet";
    const tampered = Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodePaymentRequest(tampered)).toBeNull();
  });
});

describe("fee calculation", () => {
  it("calculates fee breakdowns deterministically at 50 bps", () => {
    const breakdown = calculatePaymentBreakdown(100);
    expect(breakdown.recipientAmount).toBe(100);
    expect(breakdown.platformFee).toBe(0.5);
    expect(breakdown.totalAmount).toBe(100.5);
  });

  it("handles zero amount safely", () => {
    const breakdown = calculatePaymentBreakdown(0);
    expect(breakdown.recipientAmount).toBe(0);
    expect(breakdown.platformFee).toBe(0);
    expect(breakdown.totalAmount).toBe(0);
  });

  it("handles non-finite amount safely", () => {
    const breakdown = calculatePaymentBreakdown(NaN);
    expect(breakdown.recipientAmount).toBe(0);
    expect(breakdown.totalAmount).toBe(0);
  });

  it("does not accumulate floating-point error at SOL precision", () => {
    const breakdown = calculatePaymentBreakdown(0.1);
    const lamports = Math.round(breakdown.recipientAmount * 1_000_000_000);
    expect(lamports).toBe(100_000_000);
  });
});

describe("token mints", () => {
  it("selects the correct USDC mint by cluster", () => {
    expect(getTokenMint("USDC", "devnet").toBase58()).toBe(
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
    );
    expect(getTokenMint("USDC", "mainnet").toBase58()).toBe(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );
  });

  it("selects the correct USDT mint by cluster", () => {
    expect(getTokenMint("USDT", "devnet").toBase58()).toBe(
      "EJwZgeZrdC8TXTQbQBoL6bfuAnFUQYhy8jxToFdpknit"
    );
    expect(getTokenMint("USDT", "mainnet").toBase58()).toBe(
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
    );
  });

  it("returns 9 decimals for SOL and 6 for USDC/USDT", () => {
    expect(getTokenDecimals("SOL")).toBe(9);
    expect(getTokenDecimals("USDC")).toBe(6);
    expect(getTokenDecimals("USDT")).toBe(6);
  });
});

describe("address validation", () => {
  it("accepts a valid Solana public key", () => {
    expect(isValidSolanaAddress(VALID_RECIPIENT)).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isValidSolanaAddress("")).toBe(false);
  });

  it("rejects a random short string", () => {
    expect(isValidSolanaAddress("abc123")).toBe(false);
  });

  it("rejects an Ethereum-style address", () => {
    expect(isValidSolanaAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toBe(false);
  });
});

describe("signature format validation", () => {
  it("accepts a valid 88-char base58 signature shape", () => {
    const validSig = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d6MxGQVDDBnFQB5cWJn1sNdwL5nJpKZYf5D4KqJeJhXrD";
    expect(SIG_REGEX.test(validSig)).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(SIG_REGEX.test("")).toBe(false);
  });

  it("rejects a string with invalid base58 characters (0, O, I, l)", () => {
    const bad = "0eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d6MxGQVDDBnFQB5cWJn1sNdwL5nJpKZYf5D4KqJeJhXrD";
    expect(SIG_REGEX.test(bad)).toBe(false);
  });

  it("rejects a signature that is too short", () => {
    expect(SIG_REGEX.test("5eykt4UsFv8P8NJdTREpY1vzqKqZ")).toBe(false);
  });
});

describe("URL helpers", () => {
  it("builds canonical URLs from the configured site URL", () => {
    expect(getCanonicalUrl("/pay/test")).toContain("/pay/test");
    expect(getCanonicalUrl("/verify")).toMatch(/^https:\/\/.+\/verify$/);
  });
});
