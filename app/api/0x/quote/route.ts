import { NextResponse } from "next/server";

// 0x Swap API v1 — World Chain dedicated endpoint
const ZX_BASE = "https://worldchain.api.0x.org/swap/v1";
const ZX_API_KEY = process.env.ZX_API_KEY ?? "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Forward all query params the client sent (sellToken, buyToken, sellAmount, etc.)
  const upstreamUrl = `${ZX_BASE}/quote?${searchParams.toString()}`;

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (ZX_API_KEY) headers["0x-api-key"] = ZX_API_KEY;

    const res = await fetch(upstreamUrl, { headers, cache: "no-store" });

    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: `0x API returned non-JSON (status ${res.status})` },
        { status: 502 },
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "0x quote failed" },
      { status: 500 },
    );
  }
}
