"use client";

import { useState, useEffect, useCallback } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export interface WalletState {
  address: string | null;
  username: string | null;
  isVerified: boolean;
  isOrbVerified: boolean;
  isConnected: boolean;
  isInWorldApp: boolean;
  isLoading: boolean;
}

/**
 * Wallet hook — handles MiniKit wallet auth and user context.
 *
 * Production flow:
 *   1. MiniKit.isInstalled() → check if we're inside World App
 *   2. MiniKit.user → read pre-populated user context (address, username)
 *   3. MiniKit.walletAuth() → SIWE-based auth with backend nonce + verification
 *
 * Dev fallback:
 *   When MiniKit isn't available (local dev outside World App), a mock address
 *   is used so the UI can be developed. Clearly marked as dev-only.
 */

const DEV_MOCK_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

function isMiniKitAvailable(): boolean {
  try {
    return MiniKit.isInstalled();
  } catch {
    return false;
  }
}

function readMiniKitUser() {
  const user = MiniKit.user as {
    walletAddress?: string;
    username?: string;
    verificationStatus?: {
      isOrbVerified?: boolean;
      isDocumentVerified?: boolean;
    };
  } | null;
  return user;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    username: null,
    isVerified: false,
    isOrbVerified: false,
    isConnected: false,
    isInWorldApp: false,
    isLoading: true,
  });

  // ── Auto-connect on mount ───────────────────────────────────────
  useEffect(() => {
    const installed = isMiniKitAvailable();

    if (installed) {
      // Inside World App — read user context directly
      const user = readMiniKitUser();

      if (user?.walletAddress) {
        const vs = user.verificationStatus;
        const isOrbVerified = vs?.isOrbVerified ?? false;
        setState({
          address: user.walletAddress,
          username: user.username ?? null,
          isVerified: isOrbVerified || (vs?.isDocumentVerified ?? false),
          isOrbVerified,
          isConnected: true,
          isInWorldApp: true,
          isLoading: false,
        });
        return;
      }

      // MiniKit installed but no user yet — show connect screen
      setState((prev) => ({ ...prev, isInWorldApp: true, isLoading: false }));
      return;
    }

    // Not in World App
    if (process.env.NODE_ENV === "development") {
      // Dev fallback: auto-connect with mock so UI is testable
      setState({
        address: DEV_MOCK_ADDRESS,
        username: "worlduser",
        isVerified: true,
        isOrbVerified: true,
        isConnected: true,
        isInWorldApp: false,
        isLoading: false,
      });
      return;
    }

    // Production, not in World App — show connect/install prompt
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  // ── Explicit connect (walletAuth) ───────────────────────────────
  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    const installed = isMiniKitAvailable();

    // Dev fallback
    if (!installed && process.env.NODE_ENV === "development") {
      setState({
        address: DEV_MOCK_ADDRESS,
        username: "worlduser",
        isVerified: true,
        isOrbVerified: true,
        isConnected: true,
        isInWorldApp: false,
        isLoading: false,
      });
      return;
    }

    if (!installed) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // 1. Get nonce from backend
      const nonceRes = await fetch("/api/nonce");
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce } = await nonceRes.json();

      // 2. MiniKit walletAuth — returns { executedWith, data }
      //    data is WalletAuthResult { address, message, signature }
      const result = await MiniKit.walletAuth({
        nonce,
        statement: "Sign in to Strata Wallet",
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const { data } = result;
      if (!data?.address) {
        throw new Error("Auth cancelled or failed");
      }

      // 3. Verify SIWE signature on the backend
      const verifyRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: data.message,
          signature: data.signature,
          nonce,
        }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "Backend verification failed"
        );
      }

      const verified = (await verifyRes.json()) as {
        success: boolean;
        address: string;
      };

      // 4. Read MiniKit user context for username/verification
      const user = readMiniKitUser();
      const vs = user?.verificationStatus;
      const isOrbVerified = vs?.isOrbVerified ?? false;

      setState({
        address: verified.address,
        username: user?.username ?? null,
        isVerified: isOrbVerified || (vs?.isDocumentVerified ?? false),
        isOrbVerified,
        isConnected: true,
        isInWorldApp: result.executedWith !== "fallback",
        isLoading: false,
      });
    } catch (err) {
      console.error("Wallet connect error:", err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // ── Disconnect ──────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    const installed = isMiniKitAvailable();
    setState({
      address: null,
      username: null,
      isVerified: false,
      isOrbVerified: false,
      isConnected: false,
      isInWorldApp: installed,
      isLoading: false,
    });
  }, []);

  return { ...state, connect, disconnect };
}
