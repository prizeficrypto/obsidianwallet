"use client";

import { Settings, Search, Clock } from "lucide-react";

interface WalletHeaderProps {
  username: string | null;
  address: string | null;
  isOrbVerified: boolean;
  onSettingsTap?: () => void;
  onSearchTap?: () => void;
  onActivityTap?: () => void;
}

export default function WalletHeader({
  username,
  isOrbVerified,
  onSettingsTap,
  onSearchTap,
  onActivityTap,
}: WalletHeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-5"
      style={{
        height: 56,
        background: "rgba(10,10,10,0.98)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Account selector */}
      <button className="flex items-center gap-2 -ml-0.5 px-1.5 py-1 rounded-xl active:bg-white/[0.05] active:scale-90 transition-all duration-100">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-semibold text-white tracking-[-0.01em] leading-none">
            {username ? `@${username}` : "My Wallet"}
          </span>
          {isOrbVerified && (
            <span
              className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.06em] px-1.5 py-[3px] rounded"
              style={{
                background: "rgba(124,109,250,0.12)",
                color: "rgba(155,143,255,0.9)",
                letterSpacing: "0.06em",
              }}
            >
              ORB
            </span>
          )}
        </div>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.35, marginTop: 1 }}>
          <path d="M1 1L5 5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Right icons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onSearchTap}
          className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-white/[0.05] active:scale-90 transition-all duration-100"
          aria-label="Search tokens"
        >
          <Search size={16} strokeWidth={1.75} style={{ color: "rgba(255,255,255,0.45)" }} />
        </button>
        <button
          onClick={onActivityTap}
          className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-white/[0.05] active:scale-90 transition-all duration-100"
          aria-label="Activity"
        >
          <Clock size={16} strokeWidth={1.75} style={{ color: "rgba(255,255,255,0.45)" }} />
        </button>
        <button
          onClick={onSettingsTap}
          className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-white/[0.05] active:scale-90 transition-all duration-100"
        >
          <Settings size={17} strokeWidth={1.75} style={{ color: "rgba(255,255,255,0.45)" }} />
        </button>
      </div>
    </header>
  );
}
