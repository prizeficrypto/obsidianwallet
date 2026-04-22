"use client";

import { Clock, ExternalLink } from "lucide-react";

interface ActivityFeedProps {
  address: string | null;
}

export default function ActivityFeed({ address }: ActivityFeedProps) {
  if (!address) return null;

  return (
    <div className="px-4 pt-4 pb-6">
      <div
        className="rounded-2xl flex flex-col items-center justify-center py-12 gap-3"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <Clock size={22} style={{ color: "rgba(255,255,255,0.35)" }} />
        </div>
        <div className="text-center">
          <p className="text-white/70 font-medium text-sm">No transactions yet</p>
          <p className="text-white/30 text-xs mt-1">
            Your transaction history will appear here
          </p>
        </div>
        <a
          href={`https://worldscan.org/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs mt-1 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
        >
          View on Explorer
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
