import { NextResponse } from "next/server";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { verifyNonce } from "@/lib/nonce";

const STATEMENT = "Sign in to Obsidian";

interface VerifyRequest {
  payload: {
    address: string;
    message: string;
    signature: string;
  };
  nonce: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyRequest;
    const { payload, nonce } = body;

    if (!payload?.address || !payload?.message || !payload?.signature || !nonce) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Verify nonce is unexpired and untampered
    if (!verifyNonce(nonce)) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 401 }
      );
    }

    // 2. Verify SIWE signature — checks address, nonce, statement, and expiry
    const result = await verifySiweMessage(payload, nonce, STATEMENT);

    if (!result.isValid) {
      return NextResponse.json(
        { error: "Invalid SIWE signature" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      address: payload.address,
    });
  } catch (err) {
    console.error("[verify] Error:", err);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
