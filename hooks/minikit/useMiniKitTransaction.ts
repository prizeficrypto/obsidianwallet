"use client";

import { useCallback, useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";

export type TxState = "idle" | "pending" | "success" | "error";

interface SendTxParams {
  to: string;
  value: string;     // hex or decimal string in wei
  data?: string;
  chainId?: number;
}

export function useMiniKitTransaction() {
  const [state, setState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sendTransaction = useCallback(async (params: SendTxParams) => {
    setState("pending");
    setTxHash(null);
    setErrorMessage(null);

    try {
      if (!MiniKit.isInstalled()) throw new Error("MiniKit not available");

      const result = await MiniKit.sendTransaction({
        chainId: params.chainId ?? 480,
        transactions: [
          {
            to: params.to,
            data: params.data ?? "0x",
            value: params.value,
          },
        ],
      });

      const res = result as { transactionHash?: string; status?: string } | null;
      if (!res) throw new Error("Transaction failed");
      if (res.status === "rejected" || res.status === "error") {
        throw new Error("Transaction rejected");
      }

      setTxHash(res.transactionHash ?? null);
      setState("success");
      return res.transactionHash;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setErrorMessage(msg);
      setState("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setTxHash(null);
    setErrorMessage(null);
  }, []);

  return { sendTransaction, state, txHash, errorMessage, reset };
}
