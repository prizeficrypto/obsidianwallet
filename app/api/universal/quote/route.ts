import { NextResponse } from "next/server";

// Use app.universal.xyz directly — www.universal.xyz 302-redirects to here,
// and both require browser-like headers to pass Vercel bot detection.
const UP_BASE = "https://app.universal.xyz/api/v1";

const BROWSER_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${UP_BASE}/quote`, {
      method: "POST",
      headers: BROWSER_HEADERS,
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      return NextResponse.json(
        { error: "Rate limited – please wait a moment and try again." },
        { status: 429 }
      );
    }
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      // UP API returned non-JSON (bot check page, etc.)
      return NextResponse.json(
        { error: `UP API returned non-JSON (status ${res.status})` },
        { status: 502 }
      );
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "quote failed" },
      { status: 500 }
    );
  }
}
