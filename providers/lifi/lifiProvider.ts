import type { ISwapProvider } from "../types";
import type { Token } from "@/types/token";
import type { SwapQuote, SwapQuoteParams, SwapTx } from "@/types/swap";
import { CHAINS } from "@/lib/chains/config";
import { formatTokenAmount } from "@/lib/format";

const LIFI_API = "https://li.quest/v1";
const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

// Map our chain IDs to Li.Fi numeric chain IDs
const LIFI_CHAIN_IDS: Record<string, number> = {
  "world-chain": 480,
  ethereum: 1,
  bnb: 56,
  polygon: 137,
  avalanche: 43114,
  arbitrum: 42161,
  base: 8453,
  optimism: 10,
};

export class LifiProvider implements ISwapProvider {
  id = "lifi";
  name = "Li.Fi";
  supportedChains = Object.keys(LIFI_CHAIN_IDS);

  supportsRoute(fromChainId: string, toChainId: string): boolean {
    return fromChainId in LIFI_CHAIN_IDS && toChainId in LIFI_CHAIN_IDS;
  }

  async getQuote(params: SwapQuoteParams): Promise<SwapQuote | null> {
    const fromLifiId = LIFI_CHAIN_IDS[params.fromChainId];
    const toLifiId = LIFI_CHAIN_IDS[params.toChainId];
    if (!fromLifiId || !toLifiId) return null;

    const fromChain = CHAINS.find((c) => c.id === params.fromChainId);
    const decimals = params.fromToken.decimals;

    // Convert human amount to raw
    const [whole, frac = ""] = params.fromAmount.split(".");
    const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
    const rawAmount = (whole || "0") + fracPadded;

    try {
      const url = new URL(`${LIFI_API}/quote`);
      url.searchParams.set("fromChain", String(fromLifiId));
      url.searchParams.set("toChain", String(toLifiId));
      url.searchParams.set("fromToken", params.fromToken.address || NATIVE_TOKEN);
      url.searchParams.set("toToken", params.toToken.address || NATIVE_TOKEN);
      url.searchParams.set("fromAmount", rawAmount);
      url.searchParams.set("fromAddress", params.fromAddress);
      url.searchParams.set("slippage", String(params.slippage ?? 0.03));
      url.searchParams.set("integrator", "world-wallet");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;

      const raw = await res.json();
      if (!raw?.estimate) return null;

      const feeCosts: Array<{ amount: string; token: { decimals: number } }> =
        raw.estimate.feeCosts ?? [];
      const gasCosts: Array<{ amountUSD?: string; amount: string; token: { decimals: number } }> =
        raw.estimate.gasCosts ?? [];

      const feesUSD = feeCosts.reduce((acc: number, f) => {
        return acc + Number(f.amount) / Math.pow(10, f.token.decimals);
      }, 0);

      const gasUSD = gasCosts.reduce((acc: number, g) => {
        return acc + Number(g.amountUSD ?? 0);
      }, 0);

      const quote: SwapQuote = {
        id: raw.id ?? crypto.randomUUID(),
        provider: this.id,
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: rawAmount,
        toAmount: raw.estimate.toAmount,
        toAmountMin: raw.estimate.toAmountMin,
        fromAmountFormatted: params.fromAmount,
        toAmountFormatted: formatTokenAmount(
          raw.estimate.toAmount,
          params.toToken.decimals,
          6
        ),
        executionDuration: raw.estimate.executionDuration ?? 0,
        feesUSD,
        gasUSD,
        raw,
      };

      return quote;
    } catch {
      return null;
    }
  }

  async buildTx(quote: SwapQuote): Promise<SwapTx | null> {
    const raw = quote.raw as { transactionRequest?: SwapTx };
    if (!raw?.transactionRequest) return null;
    return raw.transactionRequest;
  }

  async getTokens(chainId: string): Promise<Token[]> {
    const lifiId = LIFI_CHAIN_IDS[chainId];
    if (!lifiId) return [];

    try {
      const res = await fetch(`${LIFI_API}/tokens?chains=${lifiId}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      const data = await res.json();
      const tokens: Array<{
        address: string;
        symbol: string;
        name: string;
        decimals: number;
        logoURI?: string;
        priceUSD?: string;
      }> = data.tokens?.[lifiId] ?? [];

      return tokens.map((t) => ({
        address: t.address === NATIVE_TOKEN ? "native" : t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        chainId,
        logoURI: t.logoURI,
        priceUSD: t.priceUSD ? Number(t.priceUSD) : undefined,
        isNative: t.address === NATIVE_TOKEN,
      }));
    } catch {
      return [];
    }
  }
}
