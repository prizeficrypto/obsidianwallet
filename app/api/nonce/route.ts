import { NextResponse } from "next/server";
import { generateNonce } from "@/lib/nonce";

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Simple in-memory store — resets on server restart. Fine for MVP:
// our invited user count is small and the nonce endpoint is low-value.
// Replace with Redis if you scale past a few hundred DAU.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;           // 10 nonces per minute per IP

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

// Prune stale entries periodically so the map doesn't grow unbounded.
function pruneRateLimitMap() {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now >= val.resetAt) rateLimitMap.delete(key);
  }
}

export async function GET(request: Request) {
  pruneRateLimitMap();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  return NextResponse.json({ nonce: generateNonce() });
}
