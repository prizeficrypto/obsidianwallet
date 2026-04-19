"use client";

import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ExternalLink, Clock, Loader2, ArrowLeft } from "lucide-react";
import { formatRelativeTime, shortenAddress } from "@/lib/format";
import { useActivityTxs } from "@/hooks/useActivityTxs";
import { useTranslation } from "@/hooks/useTranslation";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Transaction, TxType } from "@/types/transaction";

interface ActivityScreenProps {
  address: string | null;
  onBack?: () => void;
}

const TX_ICON: Record<TxType, React.ReactNode> = {
  send:    <ArrowUpRight   size={16} strokeWidth={1.75} />,
  receive: <ArrowDownLeft  size={16} strokeWidth={1.75} />,
  swap:    <ArrowLeftRight size={16} strokeWidth={1.75} />,
  bridge:  <ArrowLeftRight size={16} strokeWidth={1.75} />,
  approve: <ArrowUpRight   size={16} strokeWidth={1.75} />,
};

const TX_ICON_COLOR: Record<TxType, string> = {
  send:    "rgba(255,255,255,0.5)",
  receive: "#4ade80",
  swap:    "#60a5fa",
  bridge:  "#60a5fa",
  approve: "rgba(255,255,255,0.3)",
};

function TxRow({ tx }: { tx: Transaction }) {
  const { t } = useTranslation();
  const isReceive = tx.type === "receive";
  const isSwap    = tx.type === "swap" || tx.type === "bridge";
  const isSend    = tx.type === "send";
  const iconColor = TX_ICON_COLOR[tx.type];

  // Subtitle line
  let subtitle: string;
  if (isSwap) {
    subtitle = "Uniswap · World Chain";
  } else if (isReceive) {
    subtitle = `from ${shortenAddress(tx.from)}`;
  } else {
    subtitle = `to ${shortenAddress(tx.to)}`;
  }
  subtitle += `  ·  ${formatRelativeTime(tx.timestamp)}`;

  // Amount color
  const amountColor = isReceive ? "#4ade80" : isSwap ? "#60a5fa" : "rgba(255,255,255,0.85)";

  const txLabel = isSwap    ? t("activity.swap")     :
                  isReceive ? t("activity.received")  :
                  isSend    ? t("activity.sent")      : t("activity.approved");

  return (
    <a
      href={`https://worldchain-mainnet.explorer.alchemy.com/tx/${tx.hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-[11px] active:bg-white/[0.03] transition-colors"
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "#141414", color: iconColor }}
      >
        {TX_ICON[tx.type]}
      </div>

      {/* Label + subtitle */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-white leading-none">
          {txLabel}
        </p>
        <p
          className="text-[12px] mt-[5px] truncate"
          style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}
        >
          {subtitle}
        </p>
      </div>

      {/* Amount(s) */}
      <div className="text-right flex-shrink-0">
        {isSwap && tx.tokenIn ? (
          // Two-line swap display: received on top, spent below
          <>
            <p
              className="text-[14px] font-semibold leading-none tabular-nums"
              style={{ color: amountColor }}
            >
              +{tx.valueFormatted}
            </p>
            <p
              className="text-[11px] mt-[5px] tabular-nums"
              style={{ color: "rgba(255,255,255,0.28)", fontWeight: 400 }}
            >
              −{tx.tokenIn.valueFormatted}
            </p>
          </>
        ) : (
          <p
            className="text-[14px] font-semibold leading-none tabular-nums"
            style={{ color: amountColor }}
          >
            {isReceive ? "+" : isSend ? "−" : ""}{tx.valueFormatted}
          </p>
        )}
      </div>
    </a>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <p
      className="px-4 pt-4 pb-1"
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.07em",
        color: "rgba(255,255,255,0.22)",
        textTransform: "uppercase",
      }}
    >
      {title}
    </p>
  );
}

function Divider() {
  return <div className="mx-4" style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />;
}

function groupByDate(txs: Transaction[], t: (key: Parameters<ReturnType<typeof useTranslation>["t"]>[0]) => string): { label: string; txs: Transaction[] }[] {
  const groups = new Map<string, Transaction[]>();
  const now = Date.now();
  const dayMs = 86_400_000;

  for (const tx of txs) {
    const diff = now - tx.timestamp;
    let label: string;
    if (diff < dayMs)           label = t("activity.today");
    else if (diff < 2 * dayMs)  label = t("activity.yesterday");
    else if (diff < 7 * dayMs)  label = t("activity.thisWeek");
    else if (diff < 30 * dayMs) label = t("activity.thisMonth");
    else {
      const d = new Date(tx.timestamp);
      label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    }
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(tx);
  }

  return [...groups.entries()].map(([label, txs]) => ({ label, txs }));
}

export default function ActivityScreen({ address, onBack }: ActivityScreenProps) {
  const { data: txs, isLoading } = useActivityTxs(address);
  const { t } = useTranslation();
  const grouped = txs && txs.length > 0 ? groupByDate(txs, t) : [];

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full flex items-center justify-center active:bg-white/5 active:scale-90 transition-all duration-100 -ml-1"
              style={{ background: "#181818" }}
            >
              <ArrowLeft size={16} strokeWidth={2} className="text-white/60" />
            </button>
          )}
          <h1
            className="text-white font-bold"
            style={{ fontSize: 20, letterSpacing: "-0.02em" }}
          >
            {t("activity.title")}
          </h1>
        </div>

        {address && (
          <a
            href={`https://worldchain-mainnet.explorer.alchemy.com/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium active:opacity-70 transition-opacity"
            style={{ background: "#131316", color: "rgba(255,255,255,0.35)" }}
          >
            Explorer
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={20} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>{t("activity.loading")}</p>
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<Clock size={22} strokeWidth={1.5} />}
          title={t("activity.empty")}
          description={t("activity.emptyDesc")}
        />
      ) : (
        <div>
          {grouped.map(({ label, txs: group }) => (
            <div key={label}>
              <SectionLabel title={label} />
              {group.map((tx, i) => (
                <div key={tx.hash}>
                  <TxRow tx={tx} />
                  {i < group.length - 1 && <Divider />}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
