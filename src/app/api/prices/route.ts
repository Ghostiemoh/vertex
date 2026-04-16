import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112,EPjFW3F2Yo2W8V6Ck8tQH7ndNoYxc2mXstbx6n9KW7V,Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
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
