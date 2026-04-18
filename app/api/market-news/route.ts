import { NextResponse } from "next/server";

/**
 * Fetches trending coins and categories from CoinGecko.
 * Used for portfolio-relevant market context in the insights section.
 */

let cached: { data: unknown; at: number } | null = null;
const TTL = 10 * 60_000; // 10 minutes

export async function GET() {
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch("https://api.coingecko.com/api/v3/search/trending", {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json(cached?.data ?? { coins: [], categories: [] });
    }

    const raw = await res.json();

    const coins = (raw.coins ?? []).slice(0, 15).map((c: any) => ({
      id: c.item?.id ?? "",
      name: c.item?.name ?? "",
      symbol: (c.item?.symbol ?? "").toUpperCase(),
      marketCapRank: c.item?.market_cap_rank ?? null,
      priceChange24h: c.item?.data?.price_change_percentage_24h?.usd ?? null,
    }));

    const categories = (raw.categories ?? []).slice(0, 5).map((c: any) => ({
      id: c.id ?? 0,
      name: c.name ?? "",
      marketCapChange24h:
        c.data?.market_cap_change_percentage_24h?.usd ?? null,
    }));

    const data = { coins, categories };
    cached = { data, at: Date.now() };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(cached?.data ?? { coins: [], categories: [] });
  }
}
