"use client";

import { useRef, useState, useCallback, useMemo, useEffect, useId } from "react";

// ── Public types ────────────────────────────────────────────────────

export interface ScrubPoint {
  index: number;
  timestamp: number;
  value: number;
}

interface Props {
  data: [number, number][] | null;
  isLoading: boolean;
  height?: number;
  /** Dim while transitioning between ranges (placeholder data) */
  dimmed?: boolean;
  onScrub?: (point: ScrubPoint | null) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────

function downsample(pts: [number, number][], target: number): [number, number][] {
  if (pts.length <= target) return pts;
  const step = pts.length / target;
  return Array.from({ length: target }, (_, i) => {
    const idx = Math.min(Math.round(i * step), pts.length - 1);
    return pts[idx];
  }).filter(Boolean);
}

interface PathData {
  line: string;
  area: string;
  pts: { x: number; y: number }[];
}

/**
 * Catmull-Rom → cubic Bézier conversion.
 * Produces smooth curves that pass exactly through each data point —
 * no phantom highs/lows, just fluid line rendering.
 */
function smoothLine(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  const t = 0.28; // tension — lower = subtler smoothing
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(i - 2, 0)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(i + 1, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = p1.y + (p2.y - p0.y) * t;
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = p2.y - (p3.y - p1.y) * t;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function buildPaths(data: [number, number][], W: number, H: number, pad: number): PathData {
  if (data.length < 2) return { line: "", area: "", pts: [] };

  // Filter out any malformed entries
  const clean = data.filter((d) => d != null && typeof d[1] === "number");
  if (clean.length < 2) return { line: "", area: "", pts: [] };

  const vals = clean.map((d) => d[1]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const pts = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * W,
    y: pad + (1 - (v - min) / range) * (H - pad * 2),
  }));

  const line = smoothLine(pts);
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H} L0,${H} Z`;

  return { line, area, pts };
}

// ── Component ───────────────────────────────────────────────────────

export default function InteractiveLineChart({
  data,
  isLoading,
  height = 140,
  dimmed = false,
  onScrub,
}: Props) {
  const W = 400;
  const H = height;
  const pad = 10;
  const uid = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrubIdx, setScrubIdx] = useState<number | null>(null);
  const scrubbingRef = useRef(false);

  // Draw-on animation state (0 = hidden → 1 = fully drawn)
  const [lineProgress, setLineProgress] = useState(0);

  const sampled = useMemo(() => {
    if (!data || data.length < 2) return null;
    // Filter out any malformed entries before downsampling
    const clean = data.filter((d) => d != null && typeof d[1] === "number");
    if (clean.length < 2) return null;
    return downsample(clean, 150);
  }, [data]);

  const paths = useMemo(
    () => (sampled ? buildPaths(sampled, W, H, pad) : null),
    [sampled, H],
  );

  // Unique key per dataset — changing it restarts the draw animation
  const animKey = sampled
    ? `${sampled[0][0]}-${sampled[sampled.length - 1][0]}-${H}`
    : "empty";

  // Trigger draw-on whenever animKey changes (new data or range switch)
  useEffect(() => {
    setLineProgress(0);
    const timer = setTimeout(() => setLineProgress(1), 16);
    return () => clearTimeout(timer);
  }, [animKey]);

  const isUp = sampled
    ? sampled[sampled.length - 1][1] >= sampled[0][1]
    : true;
  const color = isUp ? "#4ade80" : "#f87171";
  const gradId = `${uid}-g`.replace(/:/g, "");

  // ── Pointer logic ───────────────────────────────────────────────

  const resolve = useCallback(
    (clientX: number) => {
      if (!containerRef.current || !sampled) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const idx = Math.round((x / rect.width) * (sampled.length - 1));
      const clamped = Math.max(0, Math.min(idx, sampled.length - 1));
      setScrubIdx(clamped);
      onScrub?.({
        index: clamped,
        timestamp: sampled[clamped][0],
        value: sampled[clamped][1],
      });
    },
    [sampled, onScrub],
  );

  const endScrub = useCallback(() => {
    scrubbingRef.current = false;
    setScrubIdx(null);
    onScrub?.(null);
  }, [onScrub]);

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      scrubbingRef.current = true;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      // Light haptic pulse on scrub start
      if (typeof navigator !== "undefined") navigator.vibrate?.(8);
      resolve(e.clientX);
    },
    [resolve],
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubbingRef.current) return;
      resolve(e.clientX);
    },
    [resolve],
  );

  const onUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      endScrub();
    },
    [endScrub],
  );

  // ── Render states ───────────────────────────────────────────────

  if (isLoading && !sampled) {
    return <div className="skeleton rounded-lg" style={{ height: H }} />;
  }

  if (!sampled || !paths) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3"
        style={{ height: H }}
      >
        {/* Ghost dashed baseline — shows the chart "lives here" */}
        <svg
          width="72%"
          height="20"
          viewBox="0 0 260 20"
          preserveAspectRatio="none"
          style={{ opacity: 0.07 }}
        >
          <path
            d="M0,10 C40,10 40,6 80,6 C120,6 120,14 160,14 C200,14 200,10 260,10"
            stroke="white"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="5 4"
          />
        </svg>
        <span
          style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.2)" }}
        >
          No historical data for this range
        </span>
      </div>
    );
  }

  const cx = scrubIdx !== null ? paths.pts[scrubIdx]?.x ?? null : null;
  const cy = scrubIdx !== null ? paths.pts[scrubIdx]?.y ?? null : null;

  // strokeDashoffset: 1 = fully hidden, 0 = fully drawn
  const dashOffset = 1 - lineProgress;

  return (
    <div
      ref={containerRef}
      style={{
        opacity: dimmed ? 0.35 : 1,
        transition: "opacity 0.25s ease",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={endScrub}
    >
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.13" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill — fades in with the line */}
        <path
          d={paths.area}
          fill={`url(#${gradId})`}
          style={{
            opacity: lineProgress * 0.9,
            transition:
              lineProgress === 0 ? "none" : "opacity 0.6s ease",
          }}
        />

        {/* Line — draws on from left to right via strokeDashoffset */}
        <path
          d={paths.line}
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          strokeDasharray="1 0"
          strokeDashoffset={dashOffset}
          vectorEffect="non-scaling-stroke"
          style={{
            transition:
              lineProgress === 0
                ? "none"
                : "stroke-dashoffset 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />

        {/* Crosshair + scrub dot */}
        {cx !== null && cy !== null && (
          <>
            <line
              x1={cx}
              y1={0}
              x2={cx}
              y2={H}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              strokeDasharray="3 3"
            />
            <circle
              cx={cx}
              cy={cy}
              r="4.5"
              fill={color}
              opacity="0.18"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={cx}
              cy={cy}
              r="3"
              fill={color}
              stroke="#0a0a0a"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>
    </div>
  );
}
