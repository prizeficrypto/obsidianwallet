import { NextResponse } from "next/server";

// Per-range cache TTLs — longer ranges change less frequently
const CACHE_TTL: Record<string, number> = {
  "1":   60_000,      // 1D  — 1 minute
  "7":   300_000,     // 1W  — 5 minutes
  "30":  600_000,     // 1M  — 10 minutes
  "365": 1_800_000,   // 1Y  — 30 minutes
  "max": 3_600_000,   // ALL — 1 hour
};

// Stale-while-revalidate TTLs — how long to serve stale data before giving up
const STALE_TTL: Record<string, number> = {
  "1":   600_000,     // 1D  — serve stale for up to 10 min
  "7":   3_600_000,   // 1W  — 1 hour
  "30":  86_400_000,  // 1M  — 1 day
  "365": 604_800_000, // 1Y  — 1 week
  "max": 604_800_000,
};

const cache = new Map<string, { data: unknown; at: number }>();

// ── CoinGecko rate limiter ──────────────────────────────────────────
// Serializes outbound requests with a gap to stay within the
// free tier limit (~30 req/min). Concurrent browser requests queue
// on the server and resolve in order.

let queueTail: Promise<void> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queueTail = queueTail
      .then(() => delay(800))
      .then(() => fn().then(resolve, reject))
      .catch(() => fn().then(resolve, reject));
  });
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Route handler ───────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id   = searchParams.get("id");
  const days = searchParams.get("days") ?? "1";

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const key = `${id}:${days}`;
  const ttl = CACHE_TTL[days] ?? 120_000;
  const staleTtl = STALE_TTL[days] ?? 600_000;
  const hit = cache.get(key);

  // Fresh cache hit — return immediately
  if (hit && Date.now() - hit.at < ttl) {
    return NextResponse.json(hit.data);
  }

  try {
    const data = await enqueue(async () => {
      const apiKey = process.env.COINGECKO_API_KEY ?? "";
      const baseUrl = apiKey
        ? `https://pro-api.coingecko.com/api/v3`
        : `https://api.coingecko.com/api/v3`;

      const url = `${baseUrl}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`;

      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "StrataWallet/1.0",
      };
      if (apiKey) headers["x-cg-pro-api-key"] = apiKey;

      const res = await fetch(url, { headers, cache: "no-store" });

      if (!res.ok) {
        console.error(`[token-chart] CoinGecko ${res.status} for ${id} days=${days}`);
        return null; // Signal failure — caller will use stale data
      }

      const raw = await res.json();
      const prices = (raw.prices ?? []) as [number, number][];
      if (prices.length === 0) return null;
      return { prices };
    });

    if (data && (data as { prices: unknown[] }).prices.length > 0) {
      cache.set(key, { data, at: Date.now() });
      return NextResponse.json(data);
    }

    // Fresh fetch returned nothing — fall back to stale cache if available
    if (hit && Date.now() - hit.at < staleTtl) {
      return NextResponse.json(hit.data);
    }

    return NextResponse.json({ prices: [] });
  } catch {
    // On any exception, serve stale data if we have it
    if (hit && Date.now() - hit.at < staleTtl) {
      return NextResponse.json(hit.data);
    }
    return NextResponse.json({ prices: [] });
  }
}
