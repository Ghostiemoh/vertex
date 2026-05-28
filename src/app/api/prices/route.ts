import { NextResponse } from "next/server";
import { TOKEN_MINTS } from "@/lib/payment-utils";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function GET() {
  const env = process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta" ? "mainnet" : "devnet";
  const ids = [
    SOL_MINT,
    TOKEN_MINTS.USDC[env],
    TOKEN_MINTS.USDT[env],
  ].join(",");

  try {
    const res = await fetch(
      `https://api.jup.ag/price/v3?ids=${ids}`,
      {
        next: { revalidate: 60 }, // Cache for 1 minute
      }
    );

    if (!res.ok) {
      throw new Error(`Jupiter API returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Price fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
