"use client";

import { useState, useEffect } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import type { SinceYouLeftData, Mover } from "@/lib/returnValue";

/**
 * Return-moment card — shown at the top of Home when the user comes back
 * after a meaningful absence. Answers two questions:
 *   1. How much did my portfolio move?
 *   2. What drove it?
 *
 * Design: a real card, not a banner. Stays until explicitly dismissed.
 * Feels like a personal note, not a notification.
 */
export default function SinceYouLeft({
  data,
  topMover,
  onDismiss,
}: {
  data: SinceYouLeftData;
  topMover: Mover | null;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const { format } = useCurrency();

  // Gentle fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setExiting(true);
    setTimeout(onDismiss, 320);
  }

  const isUp = data.changePct >= 0;
  const changeColor = isUp ? "#4ade80" : "#f87171";
  const sign = isUp ? "+" : "−";

  // Build driver line from top mover — only show if move is meaningful
  let driverText: string | null = null;
  if (topMover && Math.abs(topMover.changePct) >= 0.5) {
    const dir = topMover.changePct >= 0 ? "up" : "down";
    const abs = Math.abs(topMover.changePct).toFixed(1);
    const outcome = isUp ? "move" : "pullback";
    driverText = `${topMover.label} ${dir} ${abs}% · led the ${outcome}`;
  }

  return (
    <div
      style={{
        opacity: exiting ? 0 : visible ? 1 : 0,
        maxHeight: exiting ? 0 : 160,
        overflow: "hidden",
        transition: exiting
          ? "opacity 0.22s ease, max-height 0.3s ease 0.06s"
          : "opacity 0.38s ease",
        margin: "8px 16px 0",
      }}
    >
      <div
        style={{
          borderRadius: 16,
          background: "#141414",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "13px 14px 14px",
        }}
      >
        {/* Header row: time label + dismiss */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
            }}
          >
            {data.timeLabel}
          </p>
          <button
            onClick={dismiss}
            style={{
              color: "rgba(255,255,255,0.2)",
              padding: "4px 5px",
              margin: "-4px -5px",
            }}
            className="active:opacity-50 transition-opacity"
            aria-label="Dismiss"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M1 1l8 8M9 1L1 9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Change — the main number */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 9,
            marginBottom: driverText ? 10 : 0,
          }}
        >
          <span
            className="tabular-nums"
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: changeColor,
            }}
          >
            {sign}{format(Math.abs(data.changeUSD))}
          </span>
          <span
            className="tabular-nums"
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: changeColor,
              opacity: 0.65,
            }}
          >
            {sign}{Math.abs(data.changePct).toFixed(2)}%
          </span>
        </div>

        {/* Driver line — which asset led the move */}
        {driverText && (
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: changeColor,
                opacity: 0.45,
                flexShrink: 0,
              }}
            />
            <p
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: "rgba(255,255,255,0.38)",
                letterSpacing: "-0.01em",
                lineHeight: 1.4,
              }}
            >
              {driverText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
