import { NextRequest, NextResponse } from "next/server";

async function resolveImageUrl(url: string): Promise<string> {
  // If it's a CoinGecko coin ID lookup, fetch the correct image URL from their API
  if (url.startsWith("coingecko:")) {
    const coinId = url.slice("coingecko:".length);
    const apiRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 86400 } }
    );
    if (!apiRes.ok) throw new Error("CoinGecko lookup failed");
    const data = await apiRes.json();
    return data.image?.large ?? data.image?.small ?? data.image?.thumb;
  }
  return url;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    const resolved = await resolveImageUrl(url);
    if (!resolved) return new NextResponse("No image found", { status: 404 });

    const res = await fetch(resolved, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return new NextResponse("Upstream error", { status: 502 });

    const contentType = res.headers.get("content-type") ?? "image/png";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch", { status: 502 });
  }
}
