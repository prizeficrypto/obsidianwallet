"use client";

import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ExternalLink, Clock } from "lucide-react";
import { useTxStore } from "@/store/txStore";
import { formatUSD, formatRelativeTime, shortenAddress } from "@/lib/format";
import { TxStatusChip } from "@/components/ui/TxStatusChip";
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
  swap:    "Bought",
  bridge:  "Bought",
  approve: "Approved",
};

function TxRow({ tx }: { tx: Transaction }) {
  const isReceive = tx.type === "receive";
  const iconColor = TX_ICON_COLOR[tx.type];

  return (
    <div className="flex items-center gap-3 px-4 py-[11px]">
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
          <TxStatusChip status={tx.status} />
        </div>
        <p className="text-[12px] mt-[5px] truncate" style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>
          {isReceive ? `from ${shortenAddress(tx.from)}` : `to ${shortenAddress(tx.to)}`}
          {"  ·  "}
          {formatRelativeTime(tx.timestamp)}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p
          className="text-[14px] font-semibold leading-none tabular-nums"
          style={{ color: isReceive ? "#4ade80" : "#ffffff" }}
        >
          {isReceive ? "+" : "−"}{tx.valueFormatted}
        </p>
        {tx.valueUSD !== undefined && tx.valueUSD > 0 && (
          <p className="text-[11px] mt-[5px] tabular-nums" style={{ color: "rgba(255,255,255,0.25)", fontWeight: 400 }}>
            {formatUSD(tx.valueUSD)}
          </p>
        )}
      </div>
    </div>
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

export default function ActivityScreen({ address }: ActivityScreenProps) {
  const { pending, history } = useTxStore();
  const allTxs = [...pending, ...history];

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
            href={`https://worldscan.org/address/${address}`}
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

      <div>
        {allTxs.length === 0 ? (
          <EmptyState
            icon={<Clock size={22} strokeWidth={1.5} />}
            title="No transactions yet"
            description="Your transaction history will appear here"
          />
        ) : (
          <div>
            {pending.length > 0 && (
              <>
                <SectionLabel title="Pending" />
                {pending.map((tx, i) => (
                  <div key={tx.hash}>
                    <TxRow tx={tx} />
                    {i < pending.length - 1 && <Divider />}
                  </div>
                ))}
              </>
            )}
            {history.length > 0 && (
              <>
                <SectionLabel title="History" />
                {history.map((tx, i) => (
                  <div key={tx.hash}>
                    <TxRow tx={tx} />
                    {i < history.length - 1 && <Divider />}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
