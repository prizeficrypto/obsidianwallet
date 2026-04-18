import { COINGECKO_IDS } from "./chains";

export interface TokenPrice {
  usd: number;
  usd_24h_change: number;
}

export type PriceMap = Record<string, TokenPrice>;

export async function fetchTokenPrices(): Promise<PriceMap> {
  const ids = COINGECKO_IDS.join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 }, // Cache for 60 seconds in Next.js
  });

  if (!res.ok) throw new Error("Failed to fetch prices");

  const data = await res.json();

  const result: PriceMap = {};
  for (const [id, val] of Object.entries(data)) {
    const v = val as { usd: number; usd_24h_change: number };
    result[id] = {
      usd: v.usd ?? 0,
      usd_24h_change: v.usd_24h_change ?? 0,
    };
  }

  return result;
}

// Fallback prices in case CoinGecko is rate-limited
export const FALLBACK_PRICES: PriceMap = {
  "worldcoin-wld": { usd: 1.2, usd_24h_change: 0 },
  ethereum: { usd: 2400, usd_24h_change: 0 },
};
