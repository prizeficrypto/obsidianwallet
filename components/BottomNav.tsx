"use client";

import { Home, Clock, TrendingUp, PieChart } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: "home",      icon: Home,       label: "Home" },
  { id: "activity",  icon: Clock,      label: "Activity" },
  { id: "swap",      icon: TrendingUp, label: "Invest" },
  { id: "portfolio", icon: PieChart,   label: "Portfolio" },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto"
      style={{
        background: "rgba(11,11,11,0.98)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch justify-around px-1 pt-2 pb-2">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex flex-col items-center gap-[5px] flex-1 pt-1 pb-1 active:scale-90 transition-all duration-100 relative"
            >
              {/* Active indicator bar */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-150"
                style={{
                  width: active ? 16 : 0,
                  height: 2,
                  background: active ? "rgba(255,255,255,0.5)" : "transparent",
                }}
              />

              <Icon
                size={18}
                strokeWidth={active ? 2 : 1.5}
                style={{
                  color: active ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.28)",
                  marginTop: 4,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.02em",
                  color: active ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.22)",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
