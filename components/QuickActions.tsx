"use client";

import { ArrowUpRight, ArrowDownLeft, TrendingUp } from "lucide-react";

interface QuickActionsProps {
  onSend: () => void;
  onReceive: () => void;
  onSwap: () => void;
}

const ACTIONS = [
  { label: "Send",    icon: ArrowUpRight,  key: "send",    primary: true  },
  { label: "Receive", icon: ArrowDownLeft, key: "receive", primary: true  },
  { label: "Buy",     icon: TrendingUp,    key: "buy",     primary: false },
] as const;

export default function QuickActions({ onSend, onReceive, onSwap }: QuickActionsProps) {
  const handlers: Record<string, () => void> = {
    send: onSend,
    receive: onReceive,
    buy: onSwap,
  };

  return (
    <div className="mx-4 mt-2 grid grid-cols-3 gap-1.5">
      {ACTIONS.map(({ label, icon: Icon, key, primary }) => (
        <button
          key={key}
          onClick={handlers[key]}
          className="flex flex-col items-center justify-center gap-[6px] rounded-xl active:bg-white/[0.05] active:scale-[0.94] transition-all duration-100"
          style={{
            padding: primary ? "12px 0" : "10px 0",
            background: primary ? "#131316" : "#0c0c0d",
            border: primary
              ? "1px solid rgba(255,255,255,0.07)"
              : "1px solid rgba(255,255,255,0.025)",
          }}
        >
          <Icon
            size={primary ? 18 : 16}
            strokeWidth={primary ? 1.8 : 1.5}
            style={{ color: primary ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.30)" }}
          />
          <span
            style={{
              fontSize: primary ? 10.5 : 10,
              fontWeight: primary ? 500 : 400,
              color: primary ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)",
              letterSpacing: "0.01em",
            }}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
