import { NextResponse } from "next/server";

const UP_BASE = "https://app.universal.xyz/api/v1";

const BROWSER_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  "Accept-Language": "en-US,en;q=0.9",
};

// ── Server-side cache — avoids hammering UP API on every keystroke ────────────
const cache = new Map<string, { data: unknown; at: number }>();
const CACHE_TTL = 20_000; // 20 s — quotes are short-lived but reuse within a session

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cacheKey = JSON.stringify(body);

    // Return cached quote if still fresh
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      return NextResponse.json(hit.data);
    }

    const res = await fetch(`${UP_BASE}/quote`, {
      method: "POST",
      headers: BROWSER_HEADERS,
      body: JSON.stringify(body),
    });

    // On 429 return a structured error the client can detect
    if (res.status === 429) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429 }
      );
    }

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: `UP API returned non-JSON (status ${res.status})` },
        { status: 502 }
      );
    }

    // Cache successful responses only
    if (res.ok) cache.set(cacheKey, { data, at: Date.now() });

    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "quote failed" },
      { status: 500 }
    );
  }
}
