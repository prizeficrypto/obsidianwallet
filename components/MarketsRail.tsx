"use client";

/**
 * MarketsRail — compact horizontal strip of investable tokens on the home screen.
 *
 * Shows up to 8 tokens (stablecoins excluded) with their live price and 24h change.
 * Tapping a token navigates to its detail screen (works for 0-balance tokens too).
 * Section header "Markets →" navigates to the invest tab.
 */

import { TokenIcon } from "@/components/ChainIcon";
import { SEARCH_TOKENS } from "@/lib/searchTokens";
import type { SelectedToken } from "@/types/token";

const STABLECOIN_SYMBOLS = new Set(["USDC.e", "USDC", "USDT", "DAI", "EURC"]);
const WORLD_EXPLORER = "https://worldscan.org";

// Curated order: most recognisable tokens first
const PRIORITY = ["WLD", "WETH", "WBTC", "uSOL", "uXRP", "uDOGE", "uADA", "uLINK", "uSUI", "uXLM", "oXAUt"];

const RAIL_TOKENS = (() => {
  const bySymbol = Object.fromEntries(SEARCH_TOKENS.map((t) => [t.symbol, t]));
  return PRIORITY
    .map((s) => bySymbol[s])
    .filter((t): t is NonNullable<typeof t> => !!t && !STABLECOIN_SYMBOLS.has(t.symbol));
})();

interface MarketsRailProps {
  prices: Record<string, { usd: number; usd_24h_change: number }> | undefined;
  balanceMap?: Record<string, number>;
  onTokenTap: (token: SelectedToken) => void;
  onSeeAll: () => void;
}

function fmtPrice(usd: number): string {
  if (usd >= 10_000) return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (usd >= 100)    return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
  if (usd >= 1)      return `$${usd.toFixed(2)}`;
  if (usd >= 0.01)   return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(6)}`;
}

export default function MarketsRail({ prices, balanceMap, onTokenTap, onSeeAll }: MarketsRailProps) {
  if (!prices) return null;

  return (
    <div className="mt-4 mb-1">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" }}>
          Markets
        </p>
        <button
          onClick={onSeeAll}
          className="active:opacity-50 transition-opacity"
          style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.3)", letterSpacing: "-0.005em" }}
        >
          Invest →
        </button>
      </div>

      {/* Horizontal scroll strip */}
      <div
        className="flex gap-2 overflow-x-auto"
        style={{
          paddingLeft: 16,
          paddingRight: 16,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {RAIL_TOKENS.map((t) => {
          const price = t.coingeckoId ? prices[t.coingeckoId] : undefined;
          const change = price?.usd_24h_change ?? 0;
          const isUp = change >= 0;
          const held = balanceMap?.[t.contractAddress.toLowerCase()] ?? 0;
          const heldUSD = held > 0 && price ? held * price.usd : 0;

          return (
            <button
              key={t.contractAddress}
              onClick={() => {
                const tok: SelectedToken = {
                  symbol: t.symbol,
                  coingeckoId: t.coingeckoId ?? t.contractAddress.toLowerCase(),
                  logoURI: t.logoURI,
                  network: "World Chain",
                  balance: held,
                  balanceUSD: heldUSD,
                  priceChange24h: change,
                  explorerUrl: WORLD_EXPLORER,
                  contractAddress: t.contractAddress,
                };
                onTokenTap(tok);
              }}
              className="flex-shrink-0 flex flex-col items-center gap-[7px] active:scale-[0.93] active:opacity-70 transition-all duration-100"
              style={{
                width: 72,
                padding: "11px 6px 10px",
                borderRadius: 16,
                background: "#111111",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <TokenIcon logoURI={t.logoURI} symbol={t.symbol} size={30} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.01em" }}>
                {t.symbol.replace(/^u/, "")}
              </span>
              {price ? (
                <>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "-0.005em", lineHeight: 1 }}>
                    {fmtPrice(price.usd)}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isUp ? "#4ade80" : "#f87171",
                    lineHeight: 1,
                  }}>
                    {isUp ? "+" : ""}{change.toFixed(1)}%
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>—</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
