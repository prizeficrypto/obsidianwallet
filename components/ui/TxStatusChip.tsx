"use client";

import type { TxStatus } from "@/types/transaction";

const STATUS_CONFIG: Record<TxStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: "Pending",  color: "#F5A623", bg: "rgba(245,166,35,0.12)" },
  success:  { label: "Success",  color: "#2ECC71", bg: "rgba(46,204,113,0.12)" },
  failed:   { label: "Failed",   color: "#E74C3C", bg: "rgba(231,76,60,0.12)"  },
  unknown:  { label: "Unknown",  color: "#888",    bg: "rgba(136,136,136,0.1)" },
};

interface TxStatusChipProps {
  status: TxStatus;
  size?: "sm" | "md";
}

export function TxStatusChip({ status, size = "sm" }: TxStatusChipProps) {
  const { label, color, bg } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"
      }`}
      style={{ color, background: bg }}
    >
      {label}
    </span>
  );
}
