import { NextResponse } from "next/server";

export const revalidate = 300; // 5 minutes

/**
 * Proxies the CoinGecko /global endpoint and returns a slim payload
 * with just what the insights UI needs.
 */

// In-memory cache (survives across requests within the same serverless instance).
let cached: { data: MarketContextPayload; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface MarketContextPayload {
  marketCapChangePercent24h: number;
  btcDominance: number;
  totalMarketCapUSD: number;
  totalVolumeUSD: number;
}

export async function GET() {
  // Serve from memory cache if fresh
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global", {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      // Return stale cache if available, otherwise a safe fallback
      if (cached) return NextResponse.json(cached.data);
      return NextResponse.json(fallback());
    }

    const json = await res.json();
    const d = json.data;

    const payload: MarketContextPayload = {
      marketCapChangePercent24h: d?.market_cap_change_percentage_24h_usd ?? 0,
      btcDominance: d?.market_cap_percentage?.btc ?? 0,
      totalMarketCapUSD: d?.total_market_cap?.usd ?? 0,
      totalVolumeUSD: d?.total_volume?.usd ?? 0,
    };

    cached = { data: payload, ts: Date.now() };
    return NextResponse.json(payload);
  } catch {
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json(fallback());
  }
}

function fallback(): MarketContextPayload {
  return {
    marketCapChangePercent24h: 0,
    btcDominance: 0,
    totalMarketCapUSD: 0,
    totalVolumeUSD: 0,
  };
}
