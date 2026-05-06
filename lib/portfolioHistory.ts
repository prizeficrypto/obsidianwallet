/**
 * Portfolio history reconstruction.
 *
 * The naive portfolio chart multiplies *current* holdings by *historical*
 * prices. That's wrong — it claims you owned today's tokens during last
 * week's price moves. This module builds the corrected version:
 *
 *   1. Take the wallet's transfer history (ERC-20 Transfer events,
 *      native ETH txs, internal ETH txs).
 *   2. For each held token, derive a signed-delta event stream.
 *   3. Walk the events forward summing deltas → reconstructed timeline.
 *   4. Anchor the timeline to the *known* current balance: shift every
 *      checkpoint so the running sum at "now" matches reality. This
 *      preserves all relative changes (which is what we have evidence
 *      for) while pinning the present to ground truth — robust against
 *      missing very-old history that the explorer didn't index.
 *   5. For each timestamp on the price grid, sum (balance × price)
 *      across all tokens, skipping tokens that hadn't been acquired
 *      yet (balance==0) or are missing price data.
 */

import type {
  RawNativeTx,
  RawInternalTx,
  RawTokenTx,
} from "@/app/api/transfer-history/route";

// ── Types ───────────────────────────────────────────────────────────

export interface TransferEvent {
  /** Block timestamp in ms. */
  timestamp: number;
  /** Signed delta in token units (positive = received, negative = sent). */
  delta: number;
}

export interface BalanceCheckpoint {
  timestamp: number;
  balance: number;
}

export interface TokenSeriesInput {
  coingeckoId: string;
  symbol?: string;
  /** Reconstructed balance over time, sorted ascending by timestamp. */
  checkpoints: BalanceCheckpoint[];
  /** [timestampMs, priceUSD] pairs from CoinGecko, sorted ascending. */
  prices: [number, number][];
}

export interface PortfolioBreakdownEntry {
  tokenId: string;
  symbol?: string;
  /** USD change attributable to this token over the visible window. */
  contributionToChange: number;
}

export interface PortfolioTimeSeriesResult {
  series: [number, number][]; // [timestamp, totalUsdValue]
  breakdown: PortfolioBreakdownEntry[];
}

// ── Event extraction ────────────────────────────────────────────────

/**
 * Extract native-asset (ETH) balance change events from a wallet's
 * transaction history. Captures three sources of balance change:
 *   - outgoing value transfers (only on success)
 *   - incoming value transfers (only on success)
 *   - gas spent (always, even when the tx itself reverts)
 * Plus internal txs for contract→user value flows.
 */
export function extractNativeEvents(
  txs: RawNativeTx[],
  internalTxs: RawInternalTx[],
  user: string,
): TransferEvent[] {
  const u = user.toLowerCase();
  const events: TransferEvent[] = [];

  for (const tx of txs) {
    const ts = parseInt(tx.timeStamp, 10) * 1000;
    if (!Number.isFinite(ts) || ts <= 0) continue;
    const from = tx.from?.toLowerCase() ?? "";
    const to = tx.to?.toLowerCase() ?? "";
    const failed = tx.isError === "1" || tx.txreceipt_status === "0";

    if (from === u) {
      // Gas is paid regardless of success/failure
      try {
        const gasWei = BigInt(tx.gasUsed || "0") * BigInt(tx.gasPrice || "0");
        const gas = Number(gasWei) / 1e18;
        if (gas > 0) events.push({ timestamp: ts, delta: -gas });
      } catch {
        /* malformed numerics — skip the gas leg */
      }
      // Outgoing value moves only on success
      if (!failed) {
        try {
          const v = Number(BigInt(tx.value || "0")) / 1e18;
          if (v > 0) events.push({ timestamp: ts, delta: -v });
        } catch {
          /* skip */
        }
      }
    } else if (to === u && !failed) {
      try {
        const v = Number(BigInt(tx.value || "0")) / 1e18;
        if (v > 0) events.push({ timestamp: ts, delta: v });
      } catch {
        /* skip */
      }
    }
  }

  for (const itx of internalTxs) {
    if (itx.isError === "1") continue;
    const ts = parseInt(itx.timeStamp, 10) * 1000;
    if (!Number.isFinite(ts) || ts <= 0) continue;
    const from = itx.from?.toLowerCase() ?? "";
    const to = itx.to?.toLowerCase() ?? "";
    let v = 0;
    try {
      v = Number(BigInt(itx.value || "0")) / 1e18;
    } catch {
      continue;
    }
    if (v <= 0) continue;
    // Self-transfers (rare for internal but possible) net to zero
    if (from === u && to === u) continue;
    if (from === u) events.push({ timestamp: ts, delta: -v });
    else if (to === u) events.push({ timestamp: ts, delta: v });
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  return events;
}

/**
 * Extract balance change events for a specific ERC-20 token from the
 * combined token-transfer log. Only events for the matching contract
 * address are kept.
 */
export function extractTokenEvents(
  tokenTxs: RawTokenTx[],
  user: string,
  contractAddress: string,
): TransferEvent[] {
  const u = user.toLowerCase();
  const ca = contractAddress.toLowerCase();
  const events: TransferEvent[] = [];

  for (const tx of tokenTxs) {
    if (tx.contractAddress?.toLowerCase() !== ca) continue;
    const ts = parseInt(tx.timeStamp, 10) * 1000;
    if (!Number.isFinite(ts) || ts <= 0) continue;
    const from = tx.from?.toLowerCase() ?? "";
    const to = tx.to?.toLowerCase() ?? "";
    if (from === u && to === u) continue; // self-transfer is a no-op

    const decimals = parseInt(tx.tokenDecimal, 10) || 18;
    let v = 0;
    try {
      v = Number(BigInt(tx.value || "0")) / 10 ** decimals;
    } catch {
      continue;
    }
    if (!Number.isFinite(v) || v === 0) continue;

    if (from === u) events.push({ timestamp: ts, delta: -v });
    else if (to === u) events.push({ timestamp: ts, delta: v });
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  return events;
}

// ── Reconstruction ──────────────────────────────────────────────────

/**
 * Reconstruct a token's balance timeline from its event stream.
 *
 * We sum events forward, then add a constant offset so that the running
 * total at the most recent event equals the *actual* current balance.
 * Without this anchor, gaps in indexed history would systematically
 * underestimate the balance. The first synthetic checkpoint at t=0
 * captures the implied balance before any indexed event — i.e., the
 * residual brought into our window from outside it.
 */
export function reconstructBalanceTimeline(
  events: TransferEvent[],
  currentBalance: number,
): BalanceCheckpoint[] {
  if (events.length === 0) {
    // No history found — best we can do is assume the current balance has
    // always been the current balance. This recreates the legacy behavior
    // for that one token, but only when no transfers were indexed at all.
    return [{ timestamp: 0, balance: currentBalance }];
  }

  // Forward sum
  let running = 0;
  const raw: BalanceCheckpoint[] = events.map((ev) => {
    running += ev.delta;
    return { timestamp: ev.timestamp, balance: running };
  });

  // Anchor: shift so the final running balance matches reality.
  const offset = currentBalance - running;
  const anchored: BalanceCheckpoint[] = [
    // Implied balance "before" the first indexed event
    { timestamp: 0, balance: offset },
    ...raw.map((c) => ({ timestamp: c.timestamp, balance: c.balance + offset })),
  ];

  // Clamp to zero — negative balances are physically impossible and
  // arise only when the explorer skipped some early receive events.
  return anchored.map((c) => ({
    timestamp: c.timestamp,
    balance: c.balance < 0 ? 0 : c.balance,
  }));
}

/**
 * Balance at a given target timestamp via binary search over checkpoints.
 * Returns the balance carried *up to and including* the target time.
 */
export function balanceAt(
  checkpoints: BalanceCheckpoint[],
  target: number,
): number {
  if (checkpoints.length === 0) return 0;
  if (target < checkpoints[0].timestamp) return checkpoints[0].balance;

  let lo = 0;
  let hi = checkpoints.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (checkpoints[mid].timestamp <= target) lo = mid;
    else hi = mid - 1;
  }
  return checkpoints[lo].balance;
}

/** Nearest-price lookup over a sorted [ts, price] grid. */
export function nearestPrice(
  prices: [number, number][],
  target: number,
): number | null {
  if (prices.length === 0) return null;
  if (prices.length === 1) return prices[0][1];

  let lo = 0;
  let hi = prices.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (prices[mid][0] <= target) lo = mid;
    else hi = mid;
  }
  const dLo = Math.abs(prices[lo][0] - target);
  const dHi = Math.abs(prices[hi][0] - target);
  return dLo <= dHi ? prices[lo][1] : prices[hi][1];
}

// ── Time-series aggregation ─────────────────────────────────────────

/**
 * Build a portfolio value time series from per-token balance timelines
 * and price series.
 *
 * portfolio_value(t) = Σ_token  balance(token, t) × price(token, t)
 *
 * The output time grid is the densest input price series — which keeps
 * the chart resolution identical to the legacy behavior so existing
 * chart components don't have to change.
 */
export function buildPortfolioTimeSeries(
  inputs: TokenSeriesInput[],
): PortfolioTimeSeriesResult {
  if (inputs.length === 0) return { series: [], breakdown: [] };

  // Pick the densest price grid as the time base
  const base = inputs.reduce((best, h) =>
    h.prices.length > best.prices.length ? h : best,
  );
  const baseTs = base.prices.map(([t]) => t);

  if (baseTs.length === 0) return { series: [], breakdown: [] };

  const series: [number, number][] = baseTs.map((ts) => {
    let total = 0;
    for (const h of inputs) {
      const bal = balanceAt(h.checkpoints, ts);
      if (bal === 0) continue; // not yet acquired, or fully sold by then
      const price = nearestPrice(h.prices, ts);
      if (price === null) continue; // missing price data — skip silently
      total += bal * price;
    }
    return [ts, total];
  });

  // Per-token contribution to the visible window's USD change
  const tFirst = baseTs[0];
  const tLast = baseTs[baseTs.length - 1];
  const breakdown: PortfolioBreakdownEntry[] = inputs.map((h) => {
    const balFirst = balanceAt(h.checkpoints, tFirst);
    const balLast = balanceAt(h.checkpoints, tLast);
    const priceFirst = nearestPrice(h.prices, tFirst) ?? 0;
    const priceLast = nearestPrice(h.prices, tLast) ?? 0;
    return {
      tokenId: h.coingeckoId,
      symbol: h.symbol,
      contributionToChange: balLast * priceLast - balFirst * priceFirst,
    };
  });

  return { series, breakdown };
}
