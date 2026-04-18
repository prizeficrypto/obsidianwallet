import { NextResponse } from "next/server";
import { COINGECKO_IDS } from "@/lib/chains";
import { FALLBACK_PRICES } from "@/lib/prices";

export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: Request) {
  try {
    // Allow callers to request additional IDs (e.g. watchlist tokens)
    const { searchParams } = new URL(request.url);
    const customIds = searchParams.get("ids");
    const idsArray = customIds
      ? [...new Set([...COINGECKO_IDS, ...customIds.split(",").filter(Boolean)])]
      : COINGECKO_IDS;
    const ids = idsArray.join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(FALLBACK_PRICES);
    }

    const data = await res.json();

    const result: Record<string, { usd: number; usd_24h_change: number }> = {};
    for (const [id, val] of Object.entries(data)) {
      const v = val as { usd: number; usd_24h_change: number };
      result[id] = { usd: v.usd ?? 0, usd_24h_change: v.usd_24h_change ?? 0 };
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(FALLBACK_PRICES);
  }
}
