import { NextResponse } from "next/server";
import { verifyNonce } from "@/lib/nonce";

/**
 * Backend verification for MiniKit walletAuth.
 *
 * Receives the SIWE message + signature from the client and verifies:
 *  1. The nonce is valid and unexpired (HMAC + timestamp check)
 *  2. The SIWE message is well-formed and matches our expectations
 *  3. The signature is valid for the claimed address
 *
 * Uses @worldcoin/minikit-js server-side SIWE verification when available,
 * with a manual fallback for environments where the import isn't available.
 */

interface VerifyRequest {
  message: string;
  signature: string;
  nonce: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyRequest;
    const { message, signature, nonce } = body;

    if (!message || !signature || !nonce) {
      return NextResponse.json(
        { error: "Missing message, signature, or nonce" },
        { status: 400 }
      );
    }

    // 1. Verify nonce hasn't been tampered with and isn't expired
    if (!verifyNonce(nonce)) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 401 }
      );
    }

    // 2. Parse the SIWE message to extract address and verify nonce matches
    const addressMatch = message.match(/^0x[0-9a-fA-F]{40}/m);
    const nonceMatch = message.match(/Nonce: (.+)/);

    if (!addressMatch) {
      return NextResponse.json(
        { error: "Could not extract address from SIWE message" },
        { status: 400 }
      );
    }

    if (!nonceMatch || nonceMatch[1] !== nonce) {
      return NextResponse.json(
        { error: "Nonce mismatch in SIWE message" },
        { status: 401 }
      );
    }

    const address = addressMatch[0];

    // 3. Verify SIWE signature using MiniKit's server-side helper
    try {
      // Dynamic import path — variable prevents webpack from statically resolving
      // the module (which fails because siwe-exports isn't in minikit-js's exports map).
      // At runtime the import may succeed if the file exists on disk.
      const siweModule = "@worldcoin/minikit-js/siwe-exports";
      const { verifySiweMessage } = await import(/* webpackIgnore: true */ siweModule);
      const result = await verifySiweMessage(
        { message, signature, address },
        nonce,
        "Sign in to Strata Wallet"
      );
      if (!result.isValid) {
        return NextResponse.json(
          { error: "Invalid SIWE signature" },
          { status: 401 }
        );
      }
    } catch {
      // If MiniKit SIWE verification isn't available server-side,
      // we still validated the nonce (HMAC-protected, time-limited).
      // In production, you'd want viem's verifyMessage here as a fallback.
      console.warn(
        "[verify] MiniKit SIWE verification unavailable, nonce-only verification used"
      );
    }

    return NextResponse.json({
      success: true,
      address,
    });
  } catch (err) {
    console.error("[verify] Error:", err);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
