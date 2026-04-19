/**
 * Portfolio insight computation engine.
 *
 * Pure functions — no hooks, no side effects.
 * Derives personal insights from data already flowing through the app.
 */

import type { ChainBalance } from "@/hooks/useChainBalances";
import type { WldBalance } from "@/hooks/useWldBalance";
import type { TrendingCoin, TrendingCategory } from "@/hooks/useMarketNews";

// ── Types ───────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  text: string;
  subtext?: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface AllocationSlice {
  id: string;
  symbol: string;
  label: string;
  usd: number;
  pct: number;
  color: string;
}

export interface PortfolioInsightData {
  insights: Insight[];
  allocations: AllocationSlice[];
  portfolioChange24h: number;
}

export interface MarketEvent {
  id: string;
  text: string;
  sentiment: "positive" | "negative" | "neutral";
}

// ── Asset brand colors (tuned for dark backgrounds) ─────────────────

const ASSET_COLORS: Record<string, string> = {
  "world-chain": "#7C6DFA",
  wld: "#9B8FFF",
};

const FALLBACK_COLORS = [
  "rgba(255,255,255,0.35)",
  "rgba(255,255,255,0.22)",
  "rgba(255,255,255,0.14)",
];

// ── Internal datum ──────────────────────────────────────────────────

interface AssetDatum {
  id: string;
  symbol: string;
  network: string;
  usdValue: number;
  priceChange24h: number;
}

const NETWORK_LABELS: Record<string, string> = {};

// Short chain abbreviations for minimal disambiguation
const CHAIN_SHORT: Record<string, string> = {
  "world-chain": "WC",
};

// ── Core computation ────────────────────────────────────────────────

export function computePortfolioInsights(
  balances: ChainBalance[] | undefined,
  wldBalance: WldBalance | undefined,
  wldPriceChange: number | undefined,
  totalUSD: number,
): PortfolioInsightData {
  const empty: PortfolioInsightData = {
    insights: [],
    allocations: [],
    portfolioChange24h: 0,
  };
  if (!balances || totalUSD < 0.01) return empty;

  // ── Gather assets with meaningful value ──
  const assets: AssetDatum[] = [];

  if (wldBalance && wldBalance.usd > 0.01) {
    assets.push({
      id: "wld",
      symbol: "WLD",
      network: "World Chain",
      usdValue: wldBalance.usd,
      priceChange24h: wldPriceChange ?? 0,
    });
  }

  for (const b of balances) {
    if (b.usdValue > 0.01) {
      assets.push({
        id: b.chain.id,
        symbol: b.chain.symbol,
        network: NETWORK_LABELS[b.chain.id] ?? b.chain.name,
        usdValue: b.usdValue,
        priceChange24h: b.priceChange24h ?? 0,
      });
    }
  }

  assets.sort((a, b) => b.usdValue - a.usdValue);
  if (assets.length === 0) return empty;

  // ── Allocations ──
  // Detect duplicate symbols — only disambiguate when necessary
  const symbolCount = new Map<string, number>();
  for (const a of assets) symbolCount.set(a.symbol, (symbolCount.get(a.symbol) ?? 0) + 1);

  // For duplicates, find the largest one — it keeps the plain symbol
  const symbolLargest = new Map<string, string>();
  for (const a of assets) {
    if (!symbolLargest.has(a.symbol)) {
      symbolLargest.set(a.symbol, a.id); // first = largest (already sorted)
    }
  }

  let fallbackIdx = 0;
  const allocations: AllocationSlice[] = assets.map((a) => {
    const count = symbolCount.get(a.symbol) ?? 0;
    let label = a.symbol;
    if (count > 1 && symbolLargest.get(a.symbol) !== a.id) {
      // Smaller duplicate — add short chain label
      const short = CHAIN_SHORT[a.id] ?? a.network;
      label = `${a.symbol} (${short})`;
    }
    return {
      id: a.id,
      symbol: a.symbol,
      label,
      usd: a.usdValue,
      pct: (a.usdValue / totalUSD) * 100,
      color:
        ASSET_COLORS[a.id] ??
        FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length],
    };
  });

  // ── Portfolio-level weighted 24h change ──
  const portfolioChange24h = assets.reduce(
    (sum, a) => sum + a.priceChange24h * (a.usdValue / totalUSD),
    0,
  );

  // ── Build insights (priority-ordered) ──
  const insights: Insight[] = [];

  // 1 · Driver — which asset contributed most to today's P&L
  const withChange = assets.map((a) => ({
    ...a,
    changeUSD: a.usdValue * (a.priceChange24h / 100),
  }));
  const totalChangeUSD = withChange.reduce((s, c) => s + c.changeUSD, 0);

  if (Math.abs(totalChangeUSD) > 0.10 && assets.length > 1) {
    const byImpact = [...withChange].sort(
      (a, b) => Math.abs(b.changeUSD) - Math.abs(a.changeUSD),
    );
    const driver = byImpact[0];
    const driverPct = Math.abs(driver.changeUSD / totalChangeUSD) * 100;

    if (driverPct > 35) {
      const direction = driver.changeUSD >= 0 ? "gains" : "losses";
      const displayPct = Math.min(Math.round(driverPct), 100);
      const label = displayPct >= 95 ? "most" : `${displayPct}%`;
      insights.push({
        id: "driver",
        text: `${driver.symbol} drove ${label} of today's ${direction}`,
        sentiment: driver.changeUSD >= 0 ? "positive" : "negative",
      });
    }
  }

  // 2 · Concentration
  const topAsset = assets[0];
  const concentration = (topAsset.usdValue / totalUSD) * 100;
  if (concentration > 55 && assets.length > 1) {
    insights.push({
      id: "concentration",
      text: `${Math.round(concentration)}% of your portfolio is ${topAsset.symbol}`,
      sentiment: "neutral",
    });
  }

  // 3 · Top mover / worst mover
  const meaningful = assets.filter((a) => a.usdValue > 0.50);
  if (meaningful.length > 1) {
    const best = [...meaningful].sort(
      (a, b) => b.priceChange24h - a.priceChange24h,
    )[0];
    const worst = [...meaningful].sort(
      (a, b) => a.priceChange24h - b.priceChange24h,
    )[0];

    if (best.priceChange24h > 0.5) {
      insights.push({
        id: "top-mover",
        text: `${best.symbol} is leading your portfolio higher today`,
        sentiment: "positive",
      });
    } else if (
      worst.priceChange24h < -0.5 &&
      !insights.some((i) => i.id === "driver")
    ) {
      insights.push({
        id: "worst-mover",
        text: `${worst.symbol} is weighing on your portfolio today`,
        sentiment: "negative",
      });
    }
  }

  // 4 · Broad sentiment (only if we have room)
  if (meaningful.length >= 3 && insights.length < 3) {
    const up = meaningful.filter((a) => a.priceChange24h > 0.05).length;
    const down = meaningful.filter((a) => a.priceChange24h < -0.05).length;

    if (down >= meaningful.length - 1 && down >= 3) {
      insights.push({
        id: "sentiment",
        text: `${down} of ${meaningful.length} holdings are down today`,
        sentiment: "negative",
      });
    } else if (up >= meaningful.length - 1 && up >= 3) {
      insights.push({
        id: "sentiment",
        text: `${up} of ${meaningful.length} holdings are up today`,
        sentiment: "positive",
      });
    }
  }

  return {
    insights: insights.slice(0, 3),
    allocations,
    portfolioChange24h,
  };
}

// ── Market events generator ─────────────────────────────────────────
// Produces portfolio-relevant market context beyond simple price moves.
// Uses trending data, market comparison, and BTC dominance to explain
// what's happening and why it matters to the user.

export function generateMarketEvents(
  marketChange24h: number,
  btcDominance: number,
  portfolioChange24h: number,
  trendingCoins: TrendingCoin[],
  trendingCategories: TrendingCategory[],
  heldAssetIds: string[],
): MarketEvent[] {
  const events: MarketEvent[] = [];
  const heldSet = new Set(heldAssetIds);

  // 1 · Portfolio vs market comparison — the most personal signal
  const diff = portfolioChange24h - marketChange24h;
  if (Math.abs(diff) > 0.5 && Math.abs(marketChange24h) > 0.3) {
    if (diff > 0.5) {
      events.push({
        id: "outperform",
        text: `Your portfolio outperformed the broader market by ${Math.abs(diff).toFixed(1)}% today`,
        sentiment: "positive",
      });
    } else if (diff < -0.5) {
      const verb = marketChange24h > 0 ? "rallied" : "sold off";
      events.push({
        id: "underperform",
        text: `Crypto ${verb} ${Math.abs(marketChange24h).toFixed(1)}% but your holdings lagged by ${Math.abs(diff).toFixed(1)}%`,
        sentiment: "negative",
      });
    }
  }

  // 2a · Trending holdings — if an asset the user holds is trending (most relevant signal)
  const trendingHeld = trendingCoins.filter((c) => heldSet.has(c.id));
  if (trendingHeld.length > 0) {
    const coin = trendingHeld[0];
    const change = coin.priceChange24h;
    const changeStr =
      change != null && Math.abs(change) > 0.5
        ? ` — ${change > 0 ? "+" : ""}${change.toFixed(1)}% today`
        : "";
    events.push({
      id: "trending-held",
      text: `${coin.name} (${coin.symbol}) is trending on CoinGecko${changeStr}`,
      sentiment: change != null && change > 0 ? "positive" : "neutral",
    });
  }

  // 2b · Hot sector — trending category with meaningful move
  if (events.length < 2) {
    const hotCat = trendingCategories.find(
      (c) => c.marketCapChange24h != null && Math.abs(c.marketCapChange24h) > 2,
    );
    if (hotCat && hotCat.marketCapChange24h != null) {
      const dir = hotCat.marketCapChange24h > 0 ? "up" : "down";
      events.push({
        id: "hot-sector",
        text: `${hotCat.name} tokens ${dir} ${Math.abs(hotCat.marketCapChange24h).toFixed(1)}% today`,
        sentiment: hotCat.marketCapChange24h > 0 ? "positive" : "negative",
      });
    }
  }

  // 3 · Top trending coin (not held) driving broader moves
  if (events.length < 2) {
    const topNonHeld = trendingCoins.find(
      (c) => !heldSet.has(c.id) && c.priceChange24h != null && Math.abs(c.priceChange24h) > 3,
    );
    if (topNonHeld && topNonHeld.priceChange24h != null) {
      const dir = topNonHeld.priceChange24h > 0 ? "surging" : "falling";
      events.push({
        id: "trending-other",
        text: `${topNonHeld.name} (${topNonHeld.symbol}) ${dir} ${Math.abs(topNonHeld.priceChange24h).toFixed(1)}% — most watched coin today`,
        sentiment: topNonHeld.priceChange24h > 0 ? "positive" : "negative",
      });
    }
  }

  // 4 · Significant broad market move
  if (events.length < 2 && Math.abs(marketChange24h) > 3) {
    const verb = marketChange24h > 0 ? "rallied" : "sold off";
    // Surface a trending category as a potential cause if available
    const bigCat = trendingCategories[0];
    const causeStr = bigCat ? ` — ${bigCat.name} sector leading the move` : " — likely macro-driven";
    events.push({
      id: "big-move",
      text: `Crypto market ${verb} ${Math.abs(marketChange24h).toFixed(1)}% today${causeStr}`,
      sentiment: marketChange24h > 0 ? "positive" : "negative",
    });
  }

  // 5 · BTC dominance (only if room and notable)
  if (events.length < 2) {
    if (btcDominance > 58) {
      events.push({
        id: "btc-dom",
        text: `BTC dominance at ${btcDominance.toFixed(0)}% — capital rotating into Bitcoin away from alts`,
        sentiment: "neutral",
      });
    } else if (btcDominance < 45) {
      events.push({
        id: "btc-dom",
        text: `BTC dominance at ${btcDominance.toFixed(0)}% — altcoins gaining market share over Bitcoin`,
        sentiment: "positive",
      });
    }
  }

  // 6 · Mild market context (fallback if nothing above triggered)
  if (events.length === 0) {
    if (Math.abs(marketChange24h) > 0.1) {
      const dir = marketChange24h > 0 ? "up" : "down";
      const topTrend = trendingCoins[0];
      const trendStr = topTrend ? ` · ${topTrend.name} trending` : "";
      events.push({
        id: "market-mild",
        text: `Crypto market ${dir} ${Math.abs(marketChange24h).toFixed(1)}%${trendStr} · BTC dom ${btcDominance.toFixed(0)}%`,
        sentiment: marketChange24h > 0 ? "positive" : "negative",
      });
    } else {
      const topTrend = trendingCoins[0];
      const trendStr = topTrend ? ` · ${topTrend.name} is today's most watched coin` : "";
      events.push({
        id: "market-flat",
        text: `Markets quiet today${trendStr}`,
        sentiment: "neutral",
      });
    }
  }

  return events.slice(0, 2);
}
