import { NextResponse } from "next/server";

const RELAYER_URL = "https://relayer.universal.xyz/api/order";
const APP_URL     = "https://app.universal.xyz/api/v1/order";
const UP_API_KEY  = process.env.UP_API_KEY ?? "";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const url = UP_API_KEY ? RELAYER_URL : APP_URL;
    const headers: Record<string, string> = UP_API_KEY
      ? { "Content-Type": "application/json", "Accept": "application/json", "Authorization": `Bearer ${UP_API_KEY}` }
      : BROWSER_HEADERS;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await res.text();

    if (text.trimStart().startsWith("<")) {
      return NextResponse.json({ error: "UP API unreachable (bot-detection)" }, { status: 503 });
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: `UP API returned non-JSON (${res.status})` },
        { status: 502 },
      );
    }

    const outStatus = res.status >= 200 && res.status < 300 ? 200 : res.status;
    return NextResponse.json(data, { status: outStatus });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "order failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
