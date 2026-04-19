import { NextResponse } from "next/server";

const UP_BASES = [
  "https://app.universal.xyz/api/v1",
  "https://www.universal.xyz/api/v1",
];

const BROWSER_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://app.universal.xyz/",
  Origin: "https://app.universal.xyz",
};

// ── Server-side cache ─────────────────────────────────────────────────────────
// Reuse quotes for 45 s. Quotes are live long enough for the user to review
// and tap "Swap" without hitting the UP API on every keystroke.
const cache = new Map<string, { data: unknown; at: number }>();
const CACHE_TTL = 45_000;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// Retry with exponential backoff across both base URLs.
// Vercel hobby functions have a 10 s execution limit; we stay well under.
async function fetchQuoteWithRetry(body: unknown): Promise<{ data: unknown; ok: boolean; status: number }> {
  const delays = [0, 1500, 2500]; // 3 attempts: immediate, 1.5 s, 2.5 s

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await sleep(delays[attempt]);

    // Alternate base URLs on retries to work around per-host rate limits
    const base = UP_BASES[attempt % UP_BASES.length];

    try {
      const res = await fetch(`${base}/quote`, {
        method: "POST",
        headers: BROWSER_HEADERS,
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (res.status === 429) {
        // Still rate-limited — continue to next attempt
        continue;
      }

      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        return { data: { error: `non-JSON response (${res.status})` }, ok: false, status: 502 };
      }

      return { data, ok: res.ok, status: res.status };
    } catch {
      // Network error — try next attempt
    }
  }

  // All attempts exhausted
  return { data: { error: "rate_limited" }, ok: false, status: 429 };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cacheKey = JSON.stringify(body);

    // Serve from cache while fresh
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      return NextResponse.json(hit.data);
    }

    const { data, ok, status } = await fetchQuoteWithRetry(body);

    if (ok) cache.set(cacheKey, { data, at: Date.now() });

    return NextResponse.json(data, { status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "quote failed" },
      { status: 500 },
    );
  }
}
