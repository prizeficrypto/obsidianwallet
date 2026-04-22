import { NextResponse } from "next/server";

/**
 * Returns 7-day sparkline price arrays for a set of CoinGecko IDs.
 * Response: { [id]: number[] }  — up to 168 hourly prices
 */
export const revalidate = 300; // 5-minute cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids") ?? "";
  if (!ids) return NextResponse.json({});

  try {
    const url =
      `https://api.coingecko.com/api/v3/coins/markets` +
      `?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=7d` +
      `&per_page=50&page=1`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!res.ok) return NextResponse.json({});

    const coins = await res.json() as Array<{
      id: string;
      sparkline_in_7d?: { price: number[] };
    }>;

    const result: Record<string, number[]> = {};
    for (const coin of coins) {
      if (coin.sparkline_in_7d?.price?.length) {
        // Downsample to ~40 points to keep payload small
        const prices = coin.sparkline_in_7d.price;
        const step = Math.max(1, Math.floor(prices.length / 40));
        result[coin.id] = prices.filter((_, i) => i % step === 0);
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}
