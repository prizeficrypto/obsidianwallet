import { NextResponse } from "next/server";

/**
 * Returns the full transfer history for a wallet, used by the portfolio
 * chart to reconstruct historical balances.
 *
 * Paginates the explorer API (ascending by block) until exhausted or a
 * safety cap is hit — we want as complete a history as the indexer can
 * give us, since the chart anchors on the current balance and walks
 * the deltas backward.
 *
 *  • txlist          — native ETH transactions (gas + value transfers)
 *  • txlistinternal  — internal ETH movements (contract → user)
 *  • tokentx         — ERC-20 Transfer events
 */

const EXPLORER = "https://worldchain-mainnet.explorer.alchemy.com/api";
const PAGE_SIZE = 1000;
const MAX_PAGES = 10; // safety cap — 10k events per kind is more than enough
const CACHE_TTL_MS = 60_000; // 1 minute — transfers append-only, so this is safe
const STALE_TTL_MS = 600_000; // serve stale up to 10 min if explorer fails

type Action = "txlist" | "txlistinternal" | "tokentx";

interface CachedEntry {
  data: TransferHistoryPayload;
  at: number;
}

export interface TransferHistoryPayload {
  txs: RawNativeTx[];
  internalTxs: RawInternalTx[];
  tokenTxs: RawTokenTx[];
}

export interface RawNativeTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  timeStamp: string;
  isError: string;
  txreceipt_status: string;
}

export interface RawInternalTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError: string;
}

export interface RawTokenTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

const cache = new Map<string, CachedEntry>();

async function fetchAllPages<T>(action: Action, address: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      module: "account",
      action,
      address,
      page: String(page),
      offset: String(PAGE_SIZE),
      sort: "asc",
    });

    let pageRows: T[] = [];
    try {
      const res = await fetch(`${EXPLORER}?${params}`, { cache: "no-store" });
      if (!res.ok) break;
      const json = (await res.json()) as { result?: T[] | string };
      // Some explorers return a string error in `result` when no data — treat as empty.
      pageRows = Array.isArray(json.result) ? json.result : [];
    } catch {
      break;
    }

    if (pageRows.length === 0) break;
    all.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) break;
  }
  return all;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const key = address.toLowerCase();
  const hit = cache.get(key);

  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.data);
  }

  try {
    const [txs, internalTxs, tokenTxs] = await Promise.all([
      fetchAllPages<RawNativeTx>("txlist", address),
      fetchAllPages<RawInternalTx>("txlistinternal", address),
      fetchAllPages<RawTokenTx>("tokentx", address),
    ]);

    const data: TransferHistoryPayload = { txs, internalTxs, tokenTxs };
    cache.set(key, { data, at: Date.now() });
    return NextResponse.json(data);
  } catch {
    if (hit && Date.now() - hit.at < STALE_TTL_MS) {
      return NextResponse.json(hit.data);
    }
    return NextResponse.json({ txs: [], internalTxs: [], tokenTxs: [] });
  }
}
