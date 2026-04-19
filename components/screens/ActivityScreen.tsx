"use client";

import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ExternalLink, Clock, Loader2 } from "lucide-react";
import { formatRelativeTime, shortenAddress } from "@/lib/format";
import { useActivityTxs } from "@/hooks/useActivityTxs";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Transaction, TxType } from "@/types/transaction";

interface ActivityScreenProps {
  address: string | null;
}

const TX_ICON_COLOR: Record<TxType, string> = {
  send:    "rgba(255,255,255,0.5)",
  receive: "#4ade80",
  swap:    "#60a5fa",
  bridge:  "#60a5fa",
  approve: "rgba(255,255,255,0.3)",
};

const TX_ICON: Record<TxType, React.ReactNode> = {
  send:    <ArrowUpRight size={16} strokeWidth={1.75} />,
  receive: <ArrowDownLeft size={16} strokeWidth={1.75} />,
  swap:    <ArrowLeftRight size={16} strokeWidth={1.75} />,
  bridge:  <ArrowLeftRight size={16} strokeWidth={1.75} />,
  approve: <ArrowUpRight size={16} strokeWidth={1.75} />,
};

const TX_LABEL: Record<TxType, string> = {
  send:    "Sent",
  receive: "Received",
  swap:    "Swap",
  bridge:  "Bridge",
  approve: "Approved",
};

function TxRow({ tx }: { tx: Transaction }) {
  const isReceive = tx.type === "receive";
  const isSwap = tx.type === "swap" || tx.type === "bridge";
  const iconColor = TX_ICON_COLOR[tx.type];

  return (
    <a
      href={`https://worldchain-mainnet.explorer.alchemy.com/tx/${tx.hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-[11px] active:bg-white/[0.03] transition-colors"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "#141414", color: iconColor }}
      >
        {TX_ICON[tx.type]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-semibold text-white leading-none">
            {TX_LABEL[tx.type]}
          </p>
        </div>
        <p className="text-[12px] mt-[5px] truncate" style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>
          {isReceive
            ? `from ${shortenAddress(tx.from)}`
            : isSwap
            ? "Uniswap V3 · World Chain"
            : `to ${shortenAddress(tx.to)}`}
          {"  ·  "}
          {formatRelativeTime(tx.timestamp)}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p
          className="text-[14px] font-semibold leading-none tabular-nums"
          style={{ color: isReceive ? "#4ade80" : isSwap ? "#60a5fa" : "#ffffff" }}
        >
          {isReceive ? "+" : isSwap ? "" : "−"}{tx.valueFormatted}
        </p>
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

// Group txs by date label
function groupByDate(txs: Transaction[]): { label: string; txs: Transaction[] }[] {
  const groups: Map<string, Transaction[]> = new Map();
  const now = Date.now();
  const dayMs = 86_400_000;

  for (const tx of txs) {
    const diff = now - tx.timestamp;
    let label: string;
    if (diff < dayMs) {
      label = "Today";
    } else if (diff < 2 * dayMs) {
      label = "Yesterday";
    } else if (diff < 7 * dayMs) {
      label = "This week";
    } else if (diff < 30 * dayMs) {
      label = "This month";
    } else {
      const d = new Date(tx.timestamp);
      label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    }
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(tx);
  }

  return [...groups.entries()].map(([label, txs]) => ({ label, txs }));
}

export default function ActivityScreen({ address }: ActivityScreenProps) {
  const { data: txs, isLoading } = useActivityTxs(address);
  const grouped = txs && txs.length > 0 ? groupByDate(txs) : [];

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h1
          className="text-white font-bold"
          style={{ fontSize: 20, letterSpacing: "-0.02em" }}
        >
          Activity
        </h1>

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
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Loading activity…</p>
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<Clock size={22} strokeWidth={1.5} />}
          title="No transactions yet"
          description="Your transaction history will appear here"
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
