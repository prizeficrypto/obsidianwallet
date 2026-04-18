import crypto from "crypto";

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getHmacSecret(): string {
  const secret = process.env.NONCE_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NONCE_SECRET env var is required in production");
  }
  return "dev-secret-do-not-use-in-prod";
}

export function generateNonce(): string {
  const ts = Date.now().toString();
  const rand = crypto.randomBytes(8).toString("hex");
  const payload = `${ts}.${rand}`;
  const sig = crypto
    .createHmac("sha256", getHmacSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  return `${payload}.${sig}`;
}

export function verifyNonce(nonce: string): boolean {
  const parts = nonce.split(".");
  if (parts.length !== 3) return false;
  const [ts, rand, sig] = parts;
  const payload = `${ts}.${rand}`;
  const expected = crypto
    .createHmac("sha256", getHmacSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  if (sig !== expected) return false;
  const age = Date.now() - Number(ts);
  return age >= 0 && age <= NONCE_TTL_MS;
}
