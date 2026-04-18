import { NextResponse } from "next/server";

const VS =
  "usd,eur,gbp,jpy,krw,ars,thb,chf,cad,brl,try,inr,sgd,hkd";

const CG_URL = `https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=${VS}`;

type RateData = Record<string, number>;

const FALLBACK: RateData = {
  eur: 0.92, gbp: 0.79, jpy: 153.5, krw: 1370, ars: 910,
  thb: 35.1, chf: 0.89, cad: 1.38, brl: 5.15, try: 32.8,
  inr: 83.5, sgd: 1.35, hkd: 7.82,
};

let cache: { data: RateData; at: number } | null = null;
const TTL_MS = 60 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.data);
  }
  try {
    const res = await fetch(CG_URL, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("fetch failed");
    const json = await res.json();
    const t = json?.tether ?? {};
    const usd: number = t.usd ?? 1;
    const data: RateData = {};
    for (const key of Object.keys(FALLBACK)) {
      data[key] = t[key] != null ? t[key] / usd : FALLBACK[key];
    }
    cache = { data, at: Date.now() };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
