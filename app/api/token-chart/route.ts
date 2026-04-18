import { NextResponse } from "next/server";

// Per-range cache TTLs — longer ranges change less frequently
const CACHE_TTL: Record<string, number> = {
  "1":   60_000,      // 1D  — 1 minute
  "7":   300_000,     // 1W  — 5 minutes
  "30":  600_000,     // 1M  — 10 minutes
  "365": 1_800_000,   // 1Y  — 30 minutes
  "max": 3_600_000,   // ALL — 1 hour
};

const cache = new Map<string, { data: unknown; at: number }>();

// ── CoinGecko rate limiter ──────────────────────────────────────────
// Serializes outbound requests with a 600ms gap to stay within the
// free tier limit (~30 req/min). Concurrent browser requests queue
// on the server and resolve in order.

let queueTail: Promise<void> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queueTail = queueTail
      .then(() => delay(1200))
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
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) {
    return NextResponse.json(hit.data);
  }

  try {
    const data = await enqueue(async () => {
      const url = [
        `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`,
        `/market_chart?vs_currency=usd&days=${days}`,
      ].join("");

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "StrataWallet/1.0",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        console.error(`[token-chart] CoinGecko ${res.status} for ${id} days=${days}:`, await res.text().catch(() => ""));
        return { prices: [] as [number, number][] };
      }

      const raw = await res.json();
      return { prices: (raw.prices ?? []) as [number, number][] };
    });

    // Only cache successful, non-empty responses
    if (data.prices.length > 0) {
      cache.set(key, { data, at: Date.now() });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ prices: [] });
  }
}
