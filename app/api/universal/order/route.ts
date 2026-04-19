import { NextResponse } from "next/server";

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
    const res = await fetch(`${UP_BASE}/order`, {
      method: "POST",
      headers: BROWSER_HEADERS,
      body: JSON.stringify(body),
    });
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
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "order failed" },
      { status: 500 }
    );
  }
}
