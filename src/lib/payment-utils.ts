import { PublicKey } from "@solana/web3.js";
import {
  IS_DEVNET,
  VERTEX_NETWORK,
  PLATFORM_FEE_BPS,
  PLATFORM_FEE_ENABLED,
  SOLSCAN_CLUSTER_PARAM,
  getExplorerTxUrl,
} from "@/lib/config";

export type PaymentToken = "SOL" | "USDC" | "USDT";

export interface PaymentBreakdown {
  recipientAmount: number;
  platformFee: number;
  totalAmount: number;
  feeBps: number;
  feeEnabled: boolean;
}

export interface PaymentRequest {
  id: string;
  version: 1;
  network: "devnet" | "mainnet-beta";
  recipient: string;
  amount: number;
  token: PaymentToken;
  description?: string;
  label?: string;
  memo?: string;
  invoiceId?: string;
  invoiceNumber?: string;
}

export const TOKEN_MINTS: Record<
  Exclude<PaymentToken, "SOL">,
  { devnet: string; mainnet: string; decimals: number }
> = {
  USDC: {
    devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
  },
  USDT: {
    devnet: "EJwZgeZrdC8TXTQbQBoL6bfuAnFUQYhy8jxToFdpknit",
    mainnet: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
  },
};

export function isValidSolanaAddress(value: string): boolean {
  try {
    if (!value) return false;
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export function getTokenMint(
  token: Exclude<PaymentToken, "SOL">,
  network: "devnet" | "mainnet" = IS_DEVNET ? "devnet" : "mainnet"
): PublicKey {
  return new PublicKey(TOKEN_MINTS[token][network]);
}

export function getTokenDecimals(token: PaymentToken): number {
  return token === "SOL" ? 9 : TOKEN_MINTS[token].decimals;
}

export function calculatePaymentBreakdown(amount: number): PaymentBreakdown {
  const recipientAmount = Number.isFinite(amount) ? amount : 0;
  const platformFee = PLATFORM_FEE_ENABLED
    ? Number(((recipientAmount * PLATFORM_FEE_BPS) / 10_000).toFixed(9))
    : 0;
  const totalAmount = Number((recipientAmount + platformFee).toFixed(9));

  return {
    recipientAmount,
    platformFee,
    totalAmount,
    feeBps: PLATFORM_FEE_BPS,
    feeEnabled: PLATFORM_FEE_ENABLED,
  };
}

// Generate a short, URL-safe payment ID. ~64 bits of entropy via Web Crypto;
// stored as the primary key on a payment_requests row so the URL stays short
// instead of carrying the full payload base64-encoded.
export function generateShortPaymentId(): string {
  const bytes =
    typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
      ? crypto.getRandomValues(new Uint8Array(9))
      : (() => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const nodeCrypto = require("crypto") as typeof import("crypto");
          return nodeCrypto.randomBytes(9);
        })();
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 =
    typeof btoa !== "undefined"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodePaymentRequest(request: Omit<PaymentRequest, "id" | "version" | "network"> & {
  network?: PaymentRequest["network"];
}): string {
  const payload = {
    version: 1 as const,
    network: request.network || VERTEX_NETWORK,
    recipient: request.recipient,
    amount: request.amount,
    token: request.token,
    description: request.description,
    label: request.label,
    memo: request.memo,
    invoiceId: request.invoiceId,
    invoiceNumber: request.invoiceNumber,
  };

  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Shape of the columns we read from public.payment_requests when building a
// PaymentRequest from a short-ID lookup. Kept minimal — only the fields the
// payment + Action routes actually need to construct a transaction.
export interface PaymentRequestRowFields {
  network: PaymentRequest["network"];
  recipient_wallet: string;
  amount: number | string;
  token: PaymentToken;
  description?: string | null;
  label?: string | null;
  memo?: string | null;
  invoice_id?: string | null;
}

// Build a PaymentRequest from a DB row. Used when the URL slug resolves to a
// payment_requests row (short-ID flow). The legacy base64-encoded URL flow keeps
// using decodePaymentRequest().
export function paymentRequestFromRow(
  row: PaymentRequestRowFields,
  id: string
): PaymentRequest {
  return {
    id,
    version: 1,
    network: row.network,
    recipient: row.recipient_wallet,
    amount: Number(row.amount),
    token: row.token,
    description: row.description ?? undefined,
    label: row.label ?? undefined,
    memo: row.memo ?? undefined,
    invoiceId: row.invoice_id ?? undefined,
  };
}

export function decodePaymentRequest(encoded: string): PaymentRequest | null {
  if (!encoded) return null;

  try {
    // Restore valid base64 character set
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    const data = JSON.parse(json) as Omit<PaymentRequest, "id">;

    if (
      !data ||
      data.version !== 1 ||
      !isValidSolanaAddress(data.recipient) ||
      !Number.isFinite(data.amount) ||
      data.amount <= 0 ||
      (data.network !== "devnet" && data.network !== "mainnet-beta") ||
      !["SOL", "USDC", "USDT"].includes(data.token)
    ) {
      return null;
    }

    return {
      id: encoded,
      ...data,
    };
  } catch {
    return null;
  }
}

export function toAtomicUnits(amount: number, token: PaymentToken): number {
  const decimals = getTokenDecimals(token);
  const fixed = amount.toFixed(decimals);
  return parseInt(fixed.replace(".", ""), 10);
}

export function formatTokenAmount(amount: number, token: PaymentToken): string {
  const decimals = token === "SOL" ? 4 : 2;
  return `${amount.toFixed(decimals)} ${token}`;
}

export function getNetworkLabel(network: PaymentRequest["network"]): string {
  return network === "devnet" ? "Devnet sandbox" : "Mainnet production";
}

export function getPaymentUrl(origin: string, encoded: string): string {
  return `${origin}/pay/${encoded}`;
}

export function getSolscanClusterParam() {
  return SOLSCAN_CLUSTER_PARAM;
}

export { getExplorerTxUrl };
