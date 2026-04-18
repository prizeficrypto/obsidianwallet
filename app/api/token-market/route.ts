import { NextResponse } from "next/server";

// Server-side cache — avoids hitting CoinGecko on every client request
const cache = new Map<string, { data: unknown; at: number }>();
const CACHE_TTL = 120_000; // 2 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return NextResponse.json(hit.data);
  }

  try {
    const url = [
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`,
      "?localization=false&tickers=false&market_data=true",
      "&community_data=false&developer_data=false&sparkline=false",
    ].join("");

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const raw = await res.json();
    const md = raw.market_data ?? {};

    const data = {
      price:              md.current_price?.usd        ?? null,
      marketCap:          md.market_cap?.usd            ?? null,
      volume24h:          md.total_volume?.usd          ?? null,
      circulatingSupply:  md.circulating_supply         ?? null,
      totalSupply:        md.total_supply               ?? null,
      ath:                md.ath?.usd                   ?? null,
      athDate:            md.ath_date?.usd              ?? null,
      website:            raw.links?.homepage?.[0]      ?? null,
    };

    cache.set(id, { data, at: Date.now() });
    return NextResponse.json(data);
  } catch {
    // Return HTTP 200 with null fields so React Query does not enter error
    // state. Callers check for null and show "—" fallbacks appropriately.
    return NextResponse.json({
      price: null, marketCap: null, volume24h: null,
      circulatingSupply: null, totalSupply: null,
      ath: null, athDate: null, website: null,
    });
  }
}
