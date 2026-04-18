"use client";

import { useState } from "react";
import ChainIcon, { TokenIcon } from "./ChainIcon";
import { formatUSD, formatPercent } from "@/lib/format";
import { useSettingsStore } from "@/store/settingsStore";
import { useCurrency } from "@/hooks/useCurrency";
import type { ChainBalance } from "@/hooks/useChainBalances";
import type { WldBalance } from "@/hooks/useWldBalance";
import type { SelectedToken } from "@/types/token";

interface ChainListProps {
  balances: ChainBalance[] | undefined;
  isLoading: boolean;
  address?: string | null;
  wldBalance?: WldBalance;
  wldPriceChange?: number;
  onTokenTap?: (token: SelectedToken) => void;
}

// Smart balance formatter — precision adjusted to magnitude
function fmtBalance(value: number, symbol: string): string {
  if (value === 0) return `0 ${symbol}`;
  if (value < 0.0001) return `<0.0001 ${symbol}`;
  if (value < 0.01)   return `${value.toFixed(4)} ${symbol}`;
  if (value < 1)      return `${value.toFixed(3)} ${symbol}`;
  if (value < 100)    return `${value.toFixed(3)} ${symbol}`;
  if (value < 10000)  return `${value.toFixed(2)} ${symbol}`;
  return `${Math.round(value).toLocaleString()} ${symbol}`;
}

interface AssetRowProps {
  icon: React.ReactNode;
  symbol: string;
  balanceStr: string;
  network: string;
  fiatValue: number;
  fiatDisplay: string;
  priceChange24h?: number;
  dimmed?: boolean;
  isStale?: boolean;
  hideValue?: boolean;
  /** When true, promotes network name next to symbol for cross-chain disambiguation */
  disambiguate?: boolean;
  onClick?: () => void;
}

function AssetRow({ icon, symbol, balanceStr, network, fiatValue, fiatDisplay, priceChange24h, dimmed, isStale, hideValue, disambiguate, onClick }: AssetRowProps) {
  const hasValue = fiatValue > 0;
  const pct = priceChange24h ?? 0;
  const isPositive = pct >= 0;
  const hasPct = Math.abs(pct) >= 0.01;
  const changeColor = isPositive ? "#4ade80" : "#f87171";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-[10px] text-left active:bg-white/[0.03] transition-colors"
      style={{ opacity: dimmed ? 0.42 : 1 }}
    >
      {/* Icon */}
      <div className="flex-shrink-0">{icon}</div>

      {/* Left text */}
      <div className="flex-1 min-w-0">
        <p className="leading-tight flex items-baseline gap-1.5">
          <span
            className="text-white font-semibold"
            style={{ fontSize: 14, letterSpacing: "-0.01em" }}
          >
            {symbol}
          </span>
          {disambiguate && (
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.25)" }}>
              {network}
            </span>
          )}
        </p>
        <p className="leading-tight truncate mt-[3px]" style={{ fontSize: 12, fontWeight: 400 }}>
          {hideValue ? (
            <span style={{ color: "rgba(255,255,255,0.2)" }}>— {symbol}</span>
          ) : (
            <>
              <span style={{ color: "rgba(255,255,255,0.36)" }}>{balanceStr}</span>
              {!disambiguate && (
                <span style={{ color: "rgba(255,255,255,0.18)" }}> · {network}</span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Right text — fiat value dominates, change is secondary */}
      <div className="text-right flex-shrink-0 min-w-[64px]">
        <p
          className="leading-tight tabular-nums"
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: hasValue
              ? isStale ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.95)"
              : "rgba(255,255,255,0.2)",
          }}
        >
          {hideValue ? "••••••" : hasValue ? fiatDisplay : "—"}
          {isStale && hasValue && (
            <span style={{ fontSize: 9, fontWeight: 400, color: "rgba(255,255,255,0.25)", marginLeft: 3 }}>
              ·
            </span>
          )}
        </p>
        <p
          className="leading-tight mt-[3px] tabular-nums"
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: isStale ? "rgba(255,255,255,0.18)" : hasPct ? changeColor : "rgba(255,255,255,0.18)",
          }}
        >
          {isStale ? "updating…" : hasPct ? formatPercent(pct) : "—"}
        </p>
      </div>
    </button>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3.5 px-4 py-[10px]">
      <div className="w-9 h-9 rounded-full skeleton flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton rounded" style={{ width: 52, height: 13 }} />
        <div className="skeleton rounded" style={{ width: 88, height: 11 }} />
      </div>
      <div className="text-right space-y-2">
        <div className="skeleton rounded ml-auto" style={{ width: 52, height: 13 }} />
        <div className="skeleton rounded ml-auto" style={{ width: 36, height: 11 }} />
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="mr-4"
      style={{ height: 1, marginLeft: 66, background: "rgba(255,255,255,0.04)" }}
    />
  );
}

function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-1.5">
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.07em",
          color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      {count !== undefined && (
        <span
          className="text-[10px] font-semibold tabular-nums"
          style={{ color: "rgba(255,255,255,0.18)" }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

export default function ChainList({ balances, isLoading, wldBalance, wldPriceChange, onTokenTap }: ChainListProps) {
  const [showAll, setShowAll] = useState(false);
  const hideBalances = useSettingsStore((s) => s.hideBalances);
  const { format } = useCurrency();

  if (isLoading) {
    return (
      <div className="mt-2">
        <SectionLabel label="Assets" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <SkeletonRow />
            {i < 3 && <Divider />}
          </div>
        ))}
      </div>
    );
  }

  if (!balances && !wldBalance) return null;

  // ── Build asset row data (World Chain tokens only) ──────────────────

  interface AssetEntry {
    id: string;
    symbol: string;
    icon: React.ReactNode;
    balanceStr: string;
    network: string;
    fiatValue: number;
    fiatDisplay: string;
    priceChange24h: number;
    dimmed: boolean;
    isStale: boolean;
    disambiguate: boolean;
    token: SelectedToken;
  }

  const assets: AssetEntry[] = [];

  // WLD (ERC-20 on World Chain — tracked separately from native balances)
  if (wldBalance) {
    const amt = parseFloat(wldBalance.formatted);
    const hasValue = wldBalance.usd > 0 || amt > 0;
    assets.push({
      id: "wld",
      symbol: "WLD",
      icon: <TokenIcon logoURI={wldBalance.logoURI} symbol="WLD" size={36} bg="#1A1040" />,
      balanceStr: hasValue ? fmtBalance(amt, "WLD") : "0 WLD",
      network: "World Chain",
      fiatValue: wldBalance.usd,
      fiatDisplay: format(wldBalance.usd),
      priceChange24h: wldPriceChange ?? 0,
      dimmed: !hasValue,
      isStale: false,
      disambiguate: false,
      token: {
        symbol: "WLD",
        coingeckoId: "worldcoin-wld",
        logoURI: wldBalance.logoURI,
        network: "World Chain",
        balance: amt,
        balanceUSD: wldBalance.usd,
        priceChange24h: wldPriceChange ?? 0,
        explorerUrl: "https://worldscan.org",
        contractAddress: "0x2cFc85d8E48F8EAB294be644d9E25C3030863003",
      },
    });
  }

  // ETH on World Chain (native gas token)
  const worldChainBalance = (balances ?? []).find(b => b.chain.id === "world-chain");
  if (worldChainBalance) {
    assets.push({
      id: "world-chain",
      symbol: "ETH",
      icon: <ChainIcon chainId="world-chain" size={36} />,
      balanceStr: fmtBalance(worldChainBalance.nativeBalance, "ETH"),
      network: "World Chain",
      fiatValue: worldChainBalance.usdValue,
      fiatDisplay: format(worldChainBalance.usdValue),
      priceChange24h: worldChainBalance.priceChange24h ?? 0,
      dimmed: worldChainBalance.usdValue === 0 && !worldChainBalance.isStale,
      isStale: !!worldChainBalance.isStale,
      disambiguate: false,
      token: {
        symbol: "ETH",
        coingeckoId: worldChainBalance.chain.coingeckoId,
        chainIconId: "world-chain",
        network: "World Chain",
        balance: worldChainBalance.nativeBalance,
        balanceUSD: worldChainBalance.usdValue,
        priceChange24h: worldChainBalance.priceChange24h ?? 0,
        explorerUrl: worldChainBalance.chain.explorerUrl,
      },
    });
  }

  // Sort: assets with value first (descending), then zero-balance
  const sorted = [...assets].sort((a, b) => {
    if (a.fiatValue > 0 && b.fiatValue <= 0) return -1;
    if (a.fiatValue <= 0 && b.fiatValue > 0) return 1;
    return b.fiatValue - a.fiatValue;
  });

  // Split into active holdings and zero-balance
  const activeAssets = sorted.filter(a => a.fiatValue > 0 || a.isStale);
  const zeroAssets = sorted.filter(a => a.fiatValue <= 0 && !a.isStale);
  const visibleAssets = showAll ? sorted : activeAssets;

  return (
    <div className="mt-2">
      <SectionLabel label="Positions" count={activeAssets.length} />

      {visibleAssets.map((asset, i) => (
        <div key={asset.id}>
          <AssetRow
            icon={asset.icon}
            symbol={asset.symbol}
            balanceStr={asset.balanceStr}
            network={asset.network}
            fiatValue={asset.fiatValue}
            fiatDisplay={asset.fiatDisplay}
            priceChange24h={asset.priceChange24h}
            dimmed={asset.dimmed}
            isStale={asset.isStale}
            hideValue={hideBalances}
            disambiguate={asset.disambiguate}
            onClick={() => onTokenTap?.(asset.token)}
          />
          {i < visibleAssets.length - 1 && <Divider />}
        </div>
      ))}

      {/* Zero-balance toggle */}
      {zeroAssets.length > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center py-2.5 active:bg-white/[0.02] transition-colors"
          style={{ marginTop: 2 }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "rgba(255,255,255,0.18)",
              letterSpacing: "0.01em",
            }}
          >
            {showAll ? "Show less" : `${zeroAssets.length} more asset${zeroAssets.length > 1 ? "s" : ""}`}
          </span>
        </button>
      )}

      {/* Bottom spacer */}
      <div style={{ height: 8 }} />
    </div>
  );
}
