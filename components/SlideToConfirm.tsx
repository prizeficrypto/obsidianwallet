"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

type SlideState = "idle" | "sliding" | "executing" | "success" | "error";

interface SlideToConfirmProps {
  label: string;
  onConfirm: () => Promise<{ hash: string }>;
  onSuccess: (hash: string) => void;
  onError: (err: Error) => void;
  disabled?: boolean;
}

const THUMB_SIZE = 52;
const TRACK_H = 56;
const COMPLETE_THRESHOLD = 0.82;

export default function SlideToConfirm({
  label,
  onConfirm,
  onSuccess,
  onError,
  disabled = false,
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<SlideState>("idle");
  const [progress, setProgress] = useState(0); // 0–1
  const startXRef = useRef(0);
  const trackWidthRef = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    setState("idle");
    setProgress(0);
  }, [disabled]);

  const getTrackWidth = useCallback(() => {
    if (trackRef.current) {
      trackWidthRef.current = trackRef.current.offsetWidth;
    }
    return trackWidthRef.current;
  }, []);

  const maxTravel = useCallback(() => {
    return getTrackWidth() - THUMB_SIZE - 8;
  }, [getTrackWidth]);

  const handleStart = useCallback(
    (clientX: number) => {
      if (disabled || state !== "idle") return;
      activeRef.current = true;
      startXRef.current = clientX;
      getTrackWidth();
      setState("sliding");
      setProgress(0);
    },
    [disabled, state, getTrackWidth]
  );

  const handleMove = useCallback(
    (clientX: number) => {
      if (!activeRef.current) return;
      const travel = maxTravel();
      if (travel <= 0) return;
      const dx = Math.max(0, Math.min(clientX - startXRef.current, travel));
      setProgress(dx / travel);
    },
    [maxTravel]
  );

  const handleEnd = useCallback(async () => {
    if (!activeRef.current) return;
    activeRef.current = false;

    if (progress < COMPLETE_THRESHOLD) {
      setState("idle");
      setProgress(0);
      return;
    }

    setProgress(1);
    setState("executing");

    try {
      const result = await onConfirm();
      setState("success");
      setTimeout(() => onSuccess(result.hash), 600);
    } catch (err) {
      setState("error");
      setProgress(0);
      onError(err instanceof Error ? err : new Error("Transaction failed"));
      setTimeout(() => setState("idle"), 1200);
    }
  }, [progress, onConfirm, onSuccess, onError]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => handleStart(e.touches[0].clientX),
    [handleStart]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    },
    [handleMove]
  );

  const onTouchEnd = useCallback(() => handleEnd(), [handleEnd]);

  const travel = maxTravel() || 200;
  const thumbX = progress * travel;
  const isComplete = state === "success";
  const isExecuting = state === "executing";
  const isActive = state === "sliding";

  const fillOpacity = isComplete ? 1 : isExecuting ? 0.5 : progress * 0.35;
  const labelOpacity = isActive ? Math.max(0, 1 - progress * 2.5) : isExecuting || isComplete ? 0 : 1;

  return (
    <div
      ref={trackRef}
      className="relative select-none overflow-hidden"
      style={{
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        background: isComplete
          ? "rgba(46, 204, 113, 0.1)"
          : isExecuting
          ? "rgba(255,255,255,0.08)"
          : "white",
        border: `1px solid ${
          isComplete
            ? "rgba(46, 204, 113, 0.3)"
            : isExecuting
            ? "rgba(255,255,255,0.15)"
            : "rgba(255,255,255,0.15)"
        }`,
        opacity: disabled ? 0.35 : 1,
        transition: isActive ? "none" : "background 0.3s, border-color 0.3s, opacity 0.2s",
        touchAction: "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Fill behind thumb */}
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: thumbX + THUMB_SIZE + 4,
          borderRadius: TRACK_H / 2,
          background: isComplete
            ? "rgba(46, 204, 113, 0.15)"
            : "rgba(0,0,0,0.06)",
          opacity: fillOpacity,
          transition: isActive ? "none" : "width 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.3s",
        }}
      />

      {/* Center label */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          opacity: labelOpacity,
          transition: isActive ? "none" : "opacity 0.25s",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: isComplete || isExecuting ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
            letterSpacing: "0.01em",
          }}
        >
          {label}
        </span>
      </div>

      {/* Thumb */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          top: (TRACK_H - THUMB_SIZE) / 2,
          left: 4,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          background: isComplete
            ? "#2ecc71"
            : isExecuting
            ? "#111111"
            : "#111111",
          boxShadow: isActive
            ? "0 0 20px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.35)"
            : isComplete
            ? "0 0 16px rgba(46,204,113,0.3)"
            : "0 2px 10px rgba(0,0,0,0.25)",
          transform: `translateX(${thumbX}px)${isActive ? " scale(1.04)" : ""}`,
          transition: isActive
            ? "none"
            : "transform 0.35s cubic-bezier(0.22,1,0.36,1), background 0.3s, box-shadow 0.3s",
          cursor: disabled ? "default" : "grab",
        }}
      >
        {isComplete ? (
          <Check size={20} strokeWidth={2.5} className="text-white" />
        ) : isExecuting ? (
          <Loader2 size={18} strokeWidth={2} className="text-white animate-spin" />
        ) : (
          <ArrowRight
            size={18}
            strokeWidth={2}
            style={{
              color: "white",
              opacity: 0.9,
              transform: `translateX(${progress * 3}px)`,
              transition: isActive ? "none" : "transform 0.2s",
            }}
          />
        )}
      </div>
    </div>
  );
}
