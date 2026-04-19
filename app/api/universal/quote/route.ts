import { NextResponse } from "next/server";

/**
 * Universal Protocol quote proxy.
 *
 * Priority:
 *  1. UP_API_KEY set → POST https://relayer.universal.xyz/api/quote  (no bot-detection)
 *  2. No key → POST https://app.universal.xyz/api/v1/quote directly with browser-like
 *     headers (skip the www.universal.xyz → 302 → app redirect that Vercel intercepts)
 *
 * The 45-second cache avoids hammering the endpoint on every keystroke.
 */

const RELAYER_URL = "https://relayer.universal.xyz/api/quote";
const APP_URL     = "https://app.universal.xyz/api/v1/quote";
const UP_API_KEY  = process.env.UP_API_KEY ?? "";

const cache = new Map<string, { data: unknown; at: number }>();
const CACHE_TTL = 45_000;

// Browser-like headers so Vercel's bot-detection lets the request through
const BROWSER_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) " +
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Origin": "https://app.universal.xyz",
  "Referer": "https://app.universal.xyz/",
};

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function callQuote(body: unknown): Promise<{ data: unknown; status: number }> {
  // ── Attempt 1: relayer endpoint (requires API key, no bot-detection) ────────
  if (UP_API_KEY) {
    const res = await fetch(RELAYER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${UP_API_KEY}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();
    try {
      return { data: JSON.parse(text), status: res.status };
    } catch {
      return { data: { error: `Relayer returned non-JSON (${res.status})` }, status: 502 };
    }
  }

  // ── Attempt 2: direct app endpoint with browser headers (retry on 429) ──────
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(attempt * 1500);

    const res = await fetch(APP_URL, {
      method: "POST",
      headers: BROWSER_HEADERS,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await res.text();

    // Detect bot-detection HTML response
    if (text.trimStart().startsWith("<")) {
      if (attempt < 2) continue; // retry
      return { data: { error: "UP API unreachable (bot-detection)" }, status: 503 };
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      if (attempt < 2) continue;
      return { data: { error: `UP API returned non-JSON (${res.status})` }, status: 502 };
    }

    if (res.status === 429 && attempt < 2) continue;
    return { data, status: res.status };
  }

  return { data: { error: "UP API unavailable after retries" }, status: 503 };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cacheKey = JSON.stringify(body);

    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      return NextResponse.json(hit.data);
    }

    const { data, status } = await callQuote(body);

    if (status >= 200 && status < 300) {
      cache.set(cacheKey, { data, at: Date.now() });
    }

    return NextResponse.json(data, { status: status >= 200 && status < 300 ? 200 : status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "quote failed" },
      { status: 500 },
    );
  }
}
