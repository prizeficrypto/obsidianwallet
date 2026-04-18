import crypto from "crypto";

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Stable across warm invocations; set NONCE_SECRET on Vercel for
// cross-instance consistency (recommended). Falls back to a per-process
// random secret — secure within a single serverless instance lifetime.
const RUNTIME_SECRET =
  process.env.NONCE_SECRET ?? crypto.randomBytes(32).toString("hex");

// Nonce format: {12-char timestamp hex}{8-char random hex}{16-char hmac hex}
// = 36 hex chars — fully alphanumeric, meets MiniKit's ≥8 char requirement.
// No dots. Serverless-compatible (no shared memory needed).

export function generateNonce(): string {
  const ts = Date.now().toString(16).padStart(12, "0");
  const rand = crypto.randomBytes(4).toString("hex");
  const payload = `${ts}${rand}`;
  const sig = crypto
    .createHmac("sha256", RUNTIME_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  return `${payload}${sig}`;
}

export function verifyNonce(nonce: string): boolean {
  if (!/^[0-9a-f]{36}$/.test(nonce)) return false;
  const ts = nonce.slice(0, 12);
  const rand = nonce.slice(12, 20);
  const sig = nonce.slice(20, 36);
  const payload = `${ts}${rand}`;
  const expected = crypto
    .createHmac("sha256", RUNTIME_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  if (sig !== expected) return false;
  const timestamp = parseInt(ts, 16);
  const age = Date.now() - timestamp;
  return age >= 0 && age <= NONCE_TTL_MS;
}
