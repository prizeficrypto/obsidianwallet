export type ChainType = "evm" | "solana" | "bitcoin";

export interface ChainConfig {
  id: string;
  name: string;
  displayName: string;
  symbol: string;
  chainId: number | null;
  type: ChainType;
  rpc: string;
  color: string;
  bgColor: string;
  coingeckoId: string;
  explorerUrl: string;
  isVerified: boolean;
  decimals: number;
}

export const CHAINS: ChainConfig[] = [
  {
    // World Chain is an OP Stack L2 (chainId 480) and the primary network in World App.
    // Its native gas token is ETH. WLD is tracked separately via useWldBalance.
    id: "world-chain",
    name: "World Chain",
    displayName: "World Chain",
    symbol: "ETH",
    chainId: 480,
    type: "evm",
    rpc: process.env.NEXT_PUBLIC_RPC_WORLD_CHAIN ?? "https://worldchain-mainnet.g.alchemy.com/public",
    color: "#4B3FBF",
    bgColor: "rgba(75, 63, 191, 0.15)",
    coingeckoId: "ethereum",
    explorerUrl: "https://worldscan.org",
    isVerified: true,
    decimals: 18,
  },
];

// "ethereum" is the CoinGecko ID for ETH — used for World Chain's native token price.
export const COINGECKO_IDS = [
  "worldcoin-wld",
  "ethereum",
];

export function getChain(id: string): ChainConfig | undefined {
  return CHAINS.find((c) => c.id === id);
}
