import type { Chain } from "@/types/chain";

export const CHAINS: Chain[] = [
  {
    id: "world-chain",
    name: "World Chain",
    shortName: "WLD",
    chainType: "evm",
    chainId: 480,
    nativeCurrency: { symbol: "ETH", name: "Ether", decimals: 18 },
    rpcUrls: ["https://worldchain-mainnet.g.alchemy.com/public"],
    blockExplorerUrl: "https://worldscan.org",
    iconColor: "#4B3FBF",
    lifiChainId: 480,
  },
];

export const CHAIN_MAP: Record<string, Chain> = Object.fromEntries(
  CHAINS.map((c) => [c.id, c])
);

export const EVM_CHAINS = CHAINS.filter((c) => c.chainType === "evm");

export const DEFAULT_CHAIN = CHAIN_MAP["world-chain"];

export function getChain(id: string): Chain | undefined {
  return CHAIN_MAP[id];
}

export function getChainByEvmId(chainId: number): Chain | undefined {
  return CHAINS.find((c) => c.chainId === chainId);
}
