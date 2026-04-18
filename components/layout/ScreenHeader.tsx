"use client";

import { ArrowLeft } from "lucide-react";

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      {onBack ? (
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white/10 transition-colors"
          style={{ background: "#161616" }}
        >
          <ArrowLeft size={18} className="text-white/70" />
        </button>
      ) : (
        <div className="w-9" />
      )}

      <h1 className="text-base font-bold text-white">{title}</h1>

      <div className="w-9 flex justify-end">
        {right ?? null}
      </div>
    </div>
  );
}
