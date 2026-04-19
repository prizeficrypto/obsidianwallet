import { NextResponse } from "next/server";

const EXPLORER = "https://worldchain-mainnet.explorer.alchemy.com/api";
const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const params = new URLSearchParams({
    address,
    page: "1",
    offset: String(PAGE_SIZE),
    sort: "desc",
  });

  // Fetch native ETH txs and ERC-20 token transfers in parallel
  const [nativeRes, tokenRes] = await Promise.allSettled([
    fetch(`${EXPLORER}?module=account&action=txlist&${params}`, {
      next: { revalidate: 30 },
    }),
    fetch(`${EXPLORER}?module=account&action=tokentx&${params}`, {
      next: { revalidate: 30 },
    }),
  ]);

  const native =
    nativeRes.status === "fulfilled" && nativeRes.value.ok
      ? await nativeRes.value.json()
      : { result: [] };

  const token =
    tokenRes.status === "fulfilled" && tokenRes.value.ok
      ? await tokenRes.value.json()
      : { result: [] };

  return NextResponse.json({
    txs: Array.isArray(native.result) ? native.result : [],
    tokenTxs: Array.isArray(token.result) ? token.result : [],
  });
}
