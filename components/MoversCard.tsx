"use client";

import type { Mover } from "@/lib/returnValue";
import ChainIcon, { TokenIcon } from "@/components/ChainIcon";
import { WLD_LOGO } from "@/hooks/useWldBalance";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Compact card showing which of the user's holdings moved most
 * since their last visit. Shows up on the Home screen when there
 * are meaningful movers.
 *
 * Design: horizontal scrollable chips — skimmable in <2 seconds.
 * Calm, not alarming. No red/green background floods.
 */

// Map asset IDs (chain IDs) to chain icon IDs
const ID_TO_CHAIN_ICON: Record<string, string> = {
  ethereum: "ethereum",
  "world-chain": "world-chain",
  "worldcoin-wld": "world-chain",
  bnb: "bnb",
  polygon: "polygon",
  solana: "solana",
};

export default function MoversCard({ movers }: { movers: Mover[] }) {
  const { t } = useTranslation();
  if (movers.length === 0) return null;

  return (
    <div className="mt-4 mx-4">
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.07em",
          color: "rgba(255,255,255,0.22)",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {t("movers.title")}
      </p>

      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {movers.map((m, i) => (
          <MoverChip key={`${m.id}-${i}`} mover={m} />
        ))}
      </div>
    </div>
  );
}

function MoverChip({ mover }: { mover: Mover }) {
  const isUp = mover.changePct >= 0;
  const changeColor = isUp ? "#4ade80" : "#f87171";
  const sign = isUp ? "+" : "";
  const chainId = ID_TO_CHAIN_ICON[mover.id];
  const isWld = mover.id === "worldcoin-wld";

  return (
    <div
      className="flex items-center gap-2 px-3 py-[9px] rounded-xl flex-shrink-0"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.04)",
        minWidth: 0,
      }}
    >
      {isWld ? (
        <TokenIcon logoURI={WLD_LOGO} symbol="WLD" size={16} bg="#1A1040" />
      ) : chainId ? (
        <ChainIcon chainId={chainId} size={16} />
      ) : null}
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,0.7)",
          letterSpacing: "-0.01em",
        }}
      >
        {mover.label}
      </span>
      <span
        className="tabular-nums"
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: changeColor,
          letterSpacing: "-0.01em",
        }}
      >
        {sign}{mover.changePct.toFixed(1)}%
      </span>
    </div>
  );
}
