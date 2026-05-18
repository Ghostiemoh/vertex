import { clusterApiUrl } from "@solana/web3.js";

export type VertexNetwork = "devnet" | "mainnet-beta";

const rawNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK;

if (rawNetwork && rawNetwork !== "devnet" && rawNetwork !== "mainnet-beta") {
  console.warn(
    `[vertex][config] NEXT_PUBLIC_SOLANA_NETWORK="${rawNetwork}" is not a valid value; defaulting to mainnet-beta. Set it to "devnet" or "mainnet-beta".`
  );
}

export const VERTEX_NETWORK: VertexNetwork =
  rawNetwork === "devnet" ? "devnet" : "mainnet-beta";

export const IS_DEVNET = VERTEX_NETWORK === "devnet";
export const NETWORK_LABEL = IS_DEVNET ? "Devnet sandbox" : "Mainnet production";
export const NETWORK_SHORT_LABEL = IS_DEVNET ? "Devnet" : "Mainnet";
export const NETWORK_WARNING = IS_DEVNET
  ? "Sandbox mode. Do not use this environment for real client payments."
  : "Production payments. Double-check wallets, fees, and token amounts before sending.";

export const DEFAULT_RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(VERTEX_NETWORK);

export const SERVER_RPC_ENDPOINT =
  process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(VERTEX_NETWORK);

export const SERVER_FALLBACK_RPC_ENDPOINT =
  process.env.SOLANA_FALLBACK_RPC_URL || DEFAULT_RPC_ENDPOINT;

export const SERVER_RPC_WS_ENDPOINT = process.env.SOLANA_RPC_WSS_URL;

export const SOLSCAN_CLUSTER_PARAM = IS_DEVNET ? "devnet" : "mainnet-beta";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://vertex-pay.vercel.app";

const feeBps = Number(process.env.NEXT_PUBLIC_VERTEX_FEE_BPS ?? "50");

export const PLATFORM_FEE_BPS = Number.isFinite(feeBps) && feeBps >= 0 ? feeBps : 50;
export const PLATFORM_FEE_ENABLED = PLATFORM_FEE_BPS > 0;
export const PLATFORM_FEE_LABEL = PLATFORM_FEE_ENABLED
  ? `${(PLATFORM_FEE_BPS / 100).toFixed(2)}% Vertex fee`
  : "No Vertex fee";

export const TREASURY_WALLET =
  process.env.VERTEX_TREASURY_WALLET ||
  process.env.NEXT_PUBLIC_VERTEX_TREASURY_WALLET ||
  "43zpDV5PK347E2gqzpv2LJdDRoCwbv2deCBFcRDysFXG";

if (!process.env.VERTEX_TREASURY_WALLET && !process.env.NEXT_PUBLIC_VERTEX_TREASURY_WALLET) {
  console.warn(
    "[vertex][config] VERTEX_TREASURY_WALLET is not set — fees will route to the hardcoded fallback address. Set VERTEX_TREASURY_WALLET in your Vercel environment variables."
  );
}

export function getExplorerTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=${SOLSCAN_CLUSTER_PARAM}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `https://solscan.io/account/${address}?cluster=${SOLSCAN_CLUSTER_PARAM}`;
}
