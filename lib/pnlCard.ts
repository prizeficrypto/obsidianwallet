/**
 * PNL Card — Canvas-rendered shareable performance card.
 *
 * Produces a 1080×1080 PNG (Instagram-friendly square) with:
 *   - Token symbol as large typographic anchor
 *   - Price + 24h change
 *   - User's P&L position
 *   - Mini sparkline
 *   - Strata branding
 *
 * No external deps — uses OffscreenCanvas (or regular canvas fallback).
 */

export interface PnlCardData {
  symbol: string;
  price: number;
  change24h: number;         // percentage, e.g. -3.5
  balanceUSD: number;
  balance: number;
  network: string;
  sparkline: [number, number][];  // [timestamp, price][]
  username?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 1)    return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function fmtUSD(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtBalance(value: number, symbol: string): string {
  if (value === 0) return `0 ${symbol}`;
  if (value < 0.0001) return `<0.0001 ${symbol}`;
  if (value < 1)      return `${value.toFixed(4)} ${symbol}`;
  if (value < 100)    return `${value.toFixed(3)} ${symbol}`;
  if (value < 10_000) return `${value.toFixed(2)} ${symbol}`;
  return `${Math.round(value).toLocaleString()} ${symbol}`;
}

// ─── Sparkline path ─────────────────────────────────────────────────────────

function drawSparkline(
  ctx: CanvasRenderingContext2D,
  data: [number, number][],
  x: number, y: number, w: number, h: number,
  isUp: boolean,
) {
  if (data.length < 2) return;

  const prices = data.map(d => d[1]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const pts = prices.map((p, i) => ({
    px: x + (i / (prices.length - 1)) * w,
    py: y + (1 - (p - min) / range) * h,
  }));

  // Gradient fill under the line
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  const color = isUp ? "74, 222, 128" : "248, 113, 113";
  grad.addColorStop(0, `rgba(${color}, 0.12)`);
  grad.addColorStop(1, `rgba(${color}, 0)`);

  ctx.beginPath();
  ctx.moveTo(pts[0].px, y + h);
  for (const p of pts) ctx.lineTo(p.px, p.py);
  ctx.lineTo(pts[pts.length - 1].px, y + h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(pts[0].px, pts[0].py);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].px, pts[i].py);
  ctx.strokeStyle = isUp ? "#4ade80" : "#f87171";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

// ─── Main renderer ──────────────────────────────────────────────────────────

export function renderPnlCard(data: PnlCardData): HTMLCanvasElement {
  const S = 1080; // square
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  const isUp = data.change24h >= 0;
  const accentColor = isUp ? "#4ade80" : "#f87171";

  // ── Background ──────────────────────────────────────────────────────────
  // Deep dark with a very subtle directional gradient
  const bgGrad = ctx.createLinearGradient(0, 0, S, S);
  bgGrad.addColorStop(0, "#0c0c10");
  bgGrad.addColorStop(0.5, "#08080c");
  bgGrad.addColorStop(1, "#0a0a0e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, S, S);

  // Subtle accent glow in top-left corner
  const glowGrad = ctx.createRadialGradient(100, 100, 0, 200, 200, 500);
  const glowColor = isUp ? "74, 222, 128" : "248, 113, 113";
  glowGrad.addColorStop(0, `rgba(${glowColor}, 0.04)`);
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, S, S);

  // ── Large token symbol — typographic anchor (top-right, very large, very dim) ──
  ctx.save();
  ctx.font = "800 280px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(data.symbol, S - 60, 40);
  ctx.restore();

  // ── Top section: Token identity ─────────────────────────────────────────
  const leftPad = 80;
  let yPos = 100;

  // Symbol
  ctx.font = "700 42px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(data.symbol, leftPad, yPos);

  // Network label next to symbol
  const symbolWidth = ctx.measureText(data.symbol).width;
  ctx.font = "400 22px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillText(data.network, leftPad + symbolWidth + 16, yPos);

  // ── Price ───────────────────────────────────────────────────────────────
  yPos += 80;
  ctx.font = "700 72px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.letterSpacing = "-2px";
  ctx.fillText(fmtPrice(data.price), leftPad, yPos);
  ctx.letterSpacing = "0px";

  // 24h change
  yPos += 52;
  const changeSign = isUp ? "+" : "";
  const changeText = `${changeSign}${data.change24h.toFixed(2)}%`;
  ctx.font = "600 30px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = accentColor;
  ctx.fillText(changeText, leftPad, yPos);

  // "24h" label
  const changeWidth = ctx.measureText(changeText).width;
  ctx.font = "400 22px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillText("24h", leftPad + changeWidth + 14, yPos);

  // ── Sparkline ───────────────────────────────────────────────────────────
  const sparkY = yPos + 50;
  const sparkH = 200;
  const sparkPad = 80;

  // Downsample sparkline to ~100 points
  let sparkData = data.sparkline;
  if (sparkData.length > 100) {
    const step = sparkData.length / 100;
    sparkData = Array.from({ length: 100 }, (_, i) =>
      data.sparkline[Math.round(i * step)]
    );
  }

  if (sparkData.length >= 2) {
    drawSparkline(ctx, sparkData, sparkPad, sparkY, S - sparkPad * 2, sparkH, isUp);
  }

  // ── Horizontal divider ──────────────────────────────────────────────────
  const divY = sparkY + sparkH + 50;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftPad, divY);
  ctx.lineTo(S - leftPad, divY);
  ctx.stroke();

  // ── Your position section ───────────────────────────────────────────────
  let posY = divY + 55;

  ctx.font = "500 18px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.letterSpacing = "2px";
  ctx.fillText("YOUR POSITION", leftPad, posY);
  ctx.letterSpacing = "0px";

  posY += 55;
  // USD value (large)
  ctx.font = "700 48px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(fmtUSD(data.balanceUSD), leftPad, posY);

  // Token balance (right-aligned, smaller)
  ctx.font = "400 24px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.textAlign = "right";
  ctx.fillText(fmtBalance(data.balance, data.symbol), S - leftPad, posY);
  ctx.textAlign = "left";

  // ── Footer: branding + username ─────────────────────────────────────────
  const footerY = S - 70;

  // Strata branding (left)
  ctx.font = "600 18px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.letterSpacing = "3px";
  ctx.fillText("STRATA", leftPad, footerY);
  ctx.letterSpacing = "0px";

  // Username (right)
  if (data.username) {
    ctx.font = "400 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.textAlign = "right";
    ctx.fillText(`@${data.username}`, S - leftPad, footerY);
    ctx.textAlign = "left";
  }

  return canvas;
}

// ─── Share / download ───────────────────────────────────────────────────────

export async function sharePnlCard(canvas: HTMLCanvasElement, symbol: string): Promise<void> {
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });

  const file = new File([blob], `strata-${symbol.toLowerCase()}-pnl.png`, { type: "image/png" });

  // Try Web Share API first (mobile-native)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `${symbol} Performance`,
        text: `My ${symbol} position on Strata`,
      });
      return;
    } catch (e) {
      // User cancelled or share failed — fall through to download
      if ((e as Error).name === "AbortError") return;
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `strata-${symbol.toLowerCase()}-pnl.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
