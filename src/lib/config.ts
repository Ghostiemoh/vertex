import { clusterApiUrl } from "@solana/web3.js";

export type VertexNetwork = "devnet" | "mainnet-beta";

const rawNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK;

export const VERTEX_NETWORK: VertexNetwork =
  rawNetwork === "mainnet-beta" ? "mainnet-beta" : "devnet";

export const IS_DEVNET = VERTEX_NETWORK === "devnet";
export const NETWORK_LABEL = IS_DEVNET ? "Devnet sandbox" : "Mainnet production";
export const NETWORK_SHORT_LABEL = IS_DEVNET ? "Devnet" : "Mainnet";
export const NETWORK_WARNING = IS_DEVNET
  ? "Sandbox mode. Do not use this environment for real client payments."
  : "Production payments. Double-check wallets, fees, and token amounts before sending.";

export const DEFAULT_RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(VERTEX_NETWORK);

export const SOLSCAN_CLUSTER_PARAM = IS_DEVNET ? "devnet" : "mainnet-beta";

const feeBps = Number(process.env.NEXT_PUBLIC_VERTEX_FEE_BPS ?? "10");

export const PLATFORM_FEE_BPS = Number.isFinite(feeBps) && feeBps >= 0 ? feeBps : 10;
export const PLATFORM_FEE_ENABLED = PLATFORM_FEE_BPS > 0;
export const PLATFORM_FEE_LABEL = PLATFORM_FEE_ENABLED
  ? `${(PLATFORM_FEE_BPS / 100).toFixed(2)}% Vertex fee`
  : "No Vertex fee";

export const TREASURY_WALLET =
  process.env.NEXT_PUBLIC_VERTEX_TREASURY_WALLET ||
  "43zpDV5PK347E2gqzpv2LJdDRoCwbv2deCBFcRDysFXG";

export function getExplorerTxUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=${SOLSCAN_CLUSTER_PARAM}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `https://solscan.io/account/${address}?cluster=${SOLSCAN_CLUSTER_PARAM}`;
}
