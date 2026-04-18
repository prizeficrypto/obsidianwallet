export const LIFI_API = "https://li.quest/v1";

export interface LifiChain {
  id: number;
  key: string;
  name: string;
  nativeToken: { symbol: string; decimals: number; address: string };
}

export interface LifiToken {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  chainId: number;
  logoURI?: string;
  priceUSD?: string;
}

export interface LifiQuote {
  id: string;
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    feeCosts: Array<{ name: string; amount: string; token: { symbol: string } }>;
    gasCosts: Array<{ amount: string; token: { symbol: string } }>;
    executionDuration: number;
    approvalAddress?: string;
  };
  transactionRequest?: {
    to: string;
    from: string;
    data: string;
    value: string;
    gasPrice?: string;
    gasLimit?: string;
    chainId: number;
  };
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: LifiToken;
    toToken: LifiToken;
    fromAmount: string;
  };
  tool: string;
  toolDetails: { name: string; logoURI?: string };
}

// Li.Fi numeric chain IDs for every chain that appears in lib/chains.ts.
// arbitrum / base / optimism were intentionally removed from our chain list
// (users don't have distinct native assets there) so they are not listed here.
export const LIFI_SUPPORTED_CHAINS: Record<string, number> = {
  "world-chain": 480,
  ethereum: 1,
  bnb: 56,
  polygon: 137,
  avalanche: 43114,
};

// Native token addresses for each chain (Li.Fi uses 0x0 for native)
export const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

export async function fetchLifiTokens(chainId: number): Promise<LifiToken[]> {
  const res = await fetch(`${LIFI_API}/tokens?chains=${chainId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.tokens?.[chainId] ?? [];
}

export async function fetchLifiQuote(params: {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  // toAddress must be provided when the destination chain uses a different
  // address format (e.g. Solana base58 address when bridging to Solana).
  // For EVM→EVM routes Li.Fi defaults to fromAddress, which is correct.
  toAddress?: string;
  slippage?: number;
}): Promise<LifiQuote | null> {
  const url = new URL(`${LIFI_API}/quote`);
  url.searchParams.set("fromChain", String(params.fromChain));
  url.searchParams.set("toChain", String(params.toChain));
  url.searchParams.set("fromToken", params.fromToken);
  url.searchParams.set("toToken", params.toToken);
  url.searchParams.set("fromAmount", params.fromAmount);
  url.searchParams.set("fromAddress", params.fromAddress);
  if (params.toAddress) url.searchParams.set("toAddress", params.toAddress);
  url.searchParams.set("slippage", String(params.slippage ?? 0.005)); // 0.5% default — tighter than the old 3%
  url.searchParams.set("integrator", "strata-wallet");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  return `~${Math.round(seconds / 60)}min`;
}

export function parseAmount(amount: string, decimals: number): bigint {
  const [whole, frac = ""] = amount.split(".");
  const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + fracPadded);
}

export function formatAmount(raw: string, decimals: number, dp = 6): string {
  if (!raw || raw === "0") return "0";
  const n = Number(BigInt(raw)) / Math.pow(10, decimals);
  return n.toFixed(dp).replace(/\.?0+$/, "");
}
