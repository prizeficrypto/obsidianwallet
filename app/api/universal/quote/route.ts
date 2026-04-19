import { NextResponse } from "next/server";
import { UniversalRelayerSDK } from "universal-sdk";

// With UP_API_KEY → hits https://relayer.universal.xyz/api (higher rate limits)
// Without         → hits https://www.universal.xyz/api/v1  (public, no rate-limit issues)
// Previously we were calling app.universal.xyz which is the web-UI host — wrong endpoint.
const sdk = process.env.UP_API_KEY
  ? new UniversalRelayerSDK(process.env.UP_API_KEY)
  : new UniversalRelayerSDK();

// Cache successful quotes for 45 s to avoid repeat calls during review
const cache = new Map<string, { data: unknown; at: number }>();
const CACHE_TTL = 45_000;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cacheKey = JSON.stringify(body);

    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      return NextResponse.json(hit.data);
    }

    // Retry once on 429 with a short back-off
    let quote: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        quote = await sdk.getQuote(body as any);
        break;
      } catch (err) {
        const status =
          (err as { response?: { status?: number } })?.response?.status;
        if (status === 429 && attempt < 2) {
          await sleep((attempt + 1) * 1500);
          continue;
        }
        // Surface other errors immediately
        const msg =
          (err as { response?: { data?: { error?: string; message?: string } } })
            ?.response?.data?.error ??
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ??
          (err instanceof Error ? err.message : "quote failed");
        const code = status ?? 500;
        return NextResponse.json(
          { error: code === 429 ? "rate_limited" : msg },
          { status: code === 429 ? 429 : 500 },
        );
      }
    }

    cache.set(cacheKey, { data: quote, at: Date.now() });
    return NextResponse.json(quote);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "quote failed" },
      { status: 500 },
    );
  }
}
