"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/format";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = "85vh",
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative rounded-t-3xl flex flex-col overflow-hidden"
        style={{
          background: "#111111",
          maxHeight,
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.12)" }}
          />
        </div>

        {title && (
          <div className="px-5 pb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 active:text-white/80"
              style={{ background: "#1e1e1e" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
