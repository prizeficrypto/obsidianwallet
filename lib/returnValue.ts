/**
 * Return-value computations.
 *
 * Compares a persisted snapshot (from the user's last visit)
 * with current portfolio state to produce:
 *  - "Since you left" summary
 *  - Movers list (which held assets moved most since last visit)
 *
 * Pure functions — no hooks, no side effects.
 */

import type { AssetSnapshot, PortfolioSnapshot } from "@/store/snapshotStore";

// Short chain labels for disambiguation
const CHAIN_SHORT: Record<string, string> = {
  ethereum: "ETH",
  "world-chain": "WC",
  bnb: "BSC",
  polygon: "Polygon",
  solana: "SOL",
  avalanche: "AVAX",
};

// ── "Since you left" summary ───────────────────────────────────────

export interface SinceYouLeftData {
  /** Human-readable label: "Since Tuesday", "Since 2h ago", etc. */
  timeLabel: string;
  /** USD change since last snapshot */
  changeUSD: number;
  /** Percentage change since last snapshot */
  changePct: number;
  /** How many minutes since the snapshot */
  minutesAgo: number;
}

/**
 * Compute the "since you left" summary.
 * Returns null if the snapshot is too old (>7 days), too fresh (<5 min),
 * or if data is insufficient.
 */
export function computeSinceYouLeft(
  snapshot: PortfolioSnapshot | null,
  currentTotalUSD: number,
): SinceYouLeftData | null {
  if (!snapshot || snapshot.totalUSD < 0.01 || currentTotalUSD < 0.01) {
    return null;
  }

  const minutesAgo = (Date.now() - snapshot.timestamp) / 60_000;

  // Too fresh — user just switched tabs or refreshed
  if (minutesAgo < 5) return null;
  // Too stale — not meaningful
  if (minutesAgo > 7 * 24 * 60) return null;

  const changeUSD = currentTotalUSD - snapshot.totalUSD;
  const changePct = (changeUSD / snapshot.totalUSD) * 100;

  // Skip if change is trivially small
  if (Math.abs(changePct) < 0.01 && Math.abs(changeUSD) < 0.10) return null;

  const timeLabel = formatTimeAgo(snapshot.timestamp);

  return { timeLabel, changeUSD, changePct, minutesAgo };
}

// ── Movers ─────────────────────────────────────────────────────────

export interface Mover {
  symbol: string;
  /** Display label — may include chain suffix for disambiguation */
  label: string;
  id: string;
  /** Price change percentage since last snapshot */
  changePct: number;
  /** USD value change of this position */
  changeUSD: number;
  /** Current balance USD */
  currentUSD: number;
}

/**
 * Compare current asset prices against the snapshot to find
 * which of the user's holdings moved most since last visit.
 *
 * Returns assets sorted by absolute price change, capped at `limit`.
 */
export function computeMovers(
  snapshot: PortfolioSnapshot | null,
  currentAssets: AssetSnapshot[],
  limit = 5,
): Mover[] {
  if (!snapshot || snapshot.assets.length === 0 || currentAssets.length === 0) {
    return [];
  }

  const minutesAgo = (Date.now() - snapshot.timestamp) / 60_000;
  // Too fresh — just show normal 24h data
  if (minutesAgo < 5) return [];

  // Build lookup from snapshot
  const snapshotMap = new Map<string, AssetSnapshot>();
  for (const a of snapshot.assets) {
    snapshotMap.set(a.id, a);
  }

  const raw: Mover[] = [];
  for (const current of currentAssets) {
    const prev = snapshotMap.get(current.id);
    if (!prev || prev.priceUSD === 0 || current.balanceUSD < 0.01) continue;

    const pricePctChange =
      ((current.priceUSD - prev.priceUSD) / prev.priceUSD) * 100;
    const positionChange = current.balanceUSD - prev.balanceUSD;

    // Skip dust-level moves
    if (Math.abs(pricePctChange) < 0.05) continue;

    raw.push({
      symbol: current.symbol,
      label: current.symbol, // will be disambiguated below
      id: current.id,
      changePct: pricePctChange,
      changeUSD: positionChange,
      currentUSD: current.balanceUSD,
    });
  }

  // ── Merge movers that represent the same token across chains ────
  // Movers is about price movement, not chain-specific holdings.
  // If ETH moved +3% and the user holds ETH on Ethereum and World Chain,
  // we show one "ETH" mover, not "ETH" and "ETH (WC)".
  //
  // We merge by symbol when the price change is nearly identical
  // (within 0.5pp), meaning it's the same underlying price feed.
  const merged: Mover[] = [];
  const symbolMap = new Map<string, Mover>();

  for (const m of raw) {
    const existing = symbolMap.get(m.symbol);
    if (existing && Math.abs(existing.changePct - m.changePct) < 0.5) {
      // Same token, same price movement — merge by summing USD values
      existing.changeUSD += m.changeUSD;
      existing.currentUSD += m.currentUSD;
      // Keep the larger holding's id for icon resolution
      if (m.currentUSD > existing.currentUSD - m.currentUSD) {
        existing.id = m.id;
      }
    } else if (!existing) {
      const entry = { ...m };
      symbolMap.set(m.symbol, entry);
      merged.push(entry);
    } else {
      // Same symbol but meaningfully different price change —
      // truly different tokens (e.g. bridged vs native with price divergence).
      // Disambiguate with chain label.
      const short = CHAIN_SHORT[m.id] ?? m.id;
      m.label = `${m.symbol} (${short})`;
      if (existing.label === existing.symbol) {
        const existingShort = CHAIN_SHORT[existing.id] ?? existing.id;
        existing.label = `${existing.symbol} (${existingShort})`;
      }
      merged.push(m);
    }
  }

  // Sort by absolute price change — biggest movers first
  merged.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  return merged.slice(0, limit);
}

// ── Time formatting ────────────────────────────────────────────────

function formatTimeAgo(timestamp: number): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 60) return `Since ${diffMin}m ago`;
  if (diffHours < 24) return `Since ${diffHours}h ago`;

  // If within this week, use day name
  if (diffDays < 7) {
    const dayName = then.toLocaleDateString("en-US", { weekday: "long" });
    return `Since ${dayName}`;
  }

  // Older — use date
  return `Since ${then.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}
