/**
 * Uniswap V3 utilities for World Chain (chainId 480).
 *
 * Contract addresses confirmed from:
 *  - World Chain official docs (docs.world.org/world-chain/reference/useful-contracts)
 *  - Uniswap governance official deployments list
 */

import { createPublicClient, http, encodeFunctionData, defineChain } from "viem";

// ── Contract addresses ────────────────────────────────────────────────────────

/** Uniswap V3 SwapRouter02 on World Chain */
export const UNISWAP_SWAP_ROUTER = "0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6";

/** Uniswap V3 QuoterV2 on World Chain */
export const UNISWAP_QUOTER_V2 = "0x10158D43e6cc414deE1Bd1eB0EfC6a5cBCfF244c";

/** WETH9 on World Chain (OP Stack canonical address) */
export const WETH9 = "0x4200000000000000000000000000000000000006";

/** Native ETH sentinel (Li.Fi convention, also used in this app) */
export const NATIVE_ETH = "0x0000000000000000000000000000000000000000";

/** Slippage: 0.5% */
const SLIPPAGE_BPS = 50n;
const BPS_BASE = 10_000n;

// ── Fee tiers ─────────────────────────────────────────────────────────────────

// Ordered by most-likely-to-have-liquidity first
export const FEE_TIERS = [500, 3000, 10000, 100] as const;
export type FeeTier = (typeof FEE_TIERS)[number];

export function feeLabel(fee: number): string {
  const map: Record<number, string> = { 100: "0.01%", 500: "0.05%", 3000: "0.3%", 10000: "1%" };
  return map[fee] ?? `${((fee / 10_000) * 100).toFixed(2)}%`;
}

// ── viem public client ────────────────────────────────────────────────────────

const worldChain = defineChain({
  id: 480,
  name: "World Chain",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: {
    default: { http: ["https://worldchain-mainnet.g.alchemy.com/public"] },
  },
});

const publicClient = createPublicClient({
  chain: worldChain,
  transport: http(),
});

// ── ABIs ──────────────────────────────────────────────────────────────────────

const QUOTER_V2_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const SWAP_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "data", type: "bytes[]" }],
    name: "multicall",
    outputs: [{ name: "results", type: "bytes[]" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountMinimum", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    name: "unwrapWETH9",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map native ETH sentinel to WETH9 for Uniswap (pools always use WETH9). */
export function resolveForUniswap(address: string): string {
  return address.toLowerCase() === NATIVE_ETH.toLowerCase() ? WETH9 : address;
}

/** Apply 0.5% slippage to an amountOut. */
export function applySlippage(amountOut: bigint): bigint {
  return (amountOut * (BPS_BASE - SLIPPAGE_BPS)) / BPS_BASE;
}

// ── Quote ─────────────────────────────────────────────────────────────────────

export interface UniswapQuote {
  amountOut: bigint;
  fee: FeeTier;
  tokenIn: string;   // resolved (WETH9, not native)
  tokenOut: string;  // resolved (WETH9, not native)
}

async function tryFee(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  fee: FeeTier,
): Promise<bigint | null> {
  try {
    const { result } = await publicClient.simulateContract({
      address: UNISWAP_QUOTER_V2 as `0x${string}`,
      abi: QUOTER_V2_ABI,
      functionName: "quoteExactInputSingle",
      args: [
        {
          tokenIn: tokenIn as `0x${string}`,
          tokenOut: tokenOut as `0x${string}`,
          amountIn,
          fee,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });
    return result[0]; // amountOut
  } catch {
    return null;
  }
}

/**
 * Try all fee tiers in parallel and return the one with the best output amount.
 * Returns null when no pool exists or the amount is zero.
 */
export async function getBestQuote(
  rawTokenIn: string,
  rawTokenOut: string,
  amountIn: bigint,
): Promise<UniswapQuote | null> {
  const tokenIn = resolveForUniswap(rawTokenIn);
  const tokenOut = resolveForUniswap(rawTokenOut);

  if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) return null;
  if (amountIn <= 0n) return null;

  const results = await Promise.allSettled(
    FEE_TIERS.map(async (fee) => {
      const out = await tryFee(tokenIn, tokenOut, amountIn, fee);
      return out !== null && out > 0n ? ({ amountOut: out, fee, tokenIn, tokenOut } as UniswapQuote) : null;
    }),
  );

  let best: UniswapQuote | null = null;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value !== null) {
      if (!best || r.value.amountOut > best.amountOut) best = r.value;
    }
  }

  return best;
}

// ── Calldata builders ────────────────────────────────────────────────────────

/** ERC-20 approve calldata */
export function buildApproveCalldata(spender: string, amount: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [spender as `0x${string}`, amount],
  });
}

/** exactInputSingle calldata (ERC-20 → ERC-20, or ETH → ERC-20 with value) */
export function buildSwapCalldata(params: {
  tokenIn: string;
  tokenOut: string;
  fee: number;
  recipient: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
}): `0x${string}` {
  return encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: params.tokenIn as `0x${string}`,
        tokenOut: params.tokenOut as `0x${string}`,
        fee: params.fee,
        recipient: params.recipient as `0x${string}`,
        amountIn: params.amountIn,
        amountOutMinimum: params.amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
}

/**
 * multicall([exactInputSingle(toWETH9, recipient=router), unwrapWETH9(min, user)])
 * Used when the user wants to receive native ETH as output.
 */
export function buildSwapToEthCalldata(params: {
  tokenIn: string;
  fee: number;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: string;
}): `0x${string}` {
  // Step 1: swap tokenIn → WETH9, send WETH to router so it can unwrap
  const swapData = buildSwapCalldata({
    tokenIn: params.tokenIn,
    tokenOut: WETH9,
    fee: params.fee,
    recipient: UNISWAP_SWAP_ROUTER, // router holds WETH temporarily
    amountIn: params.amountIn,
    amountOutMinimum: params.amountOutMinimum,
  });

  // Step 2: unwrap WETH9 → ETH and send to user
  const unwrapData = encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: "unwrapWETH9",
    args: [params.amountOutMinimum, params.recipient as `0x${string}`],
  });

  return encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: "multicall",
    args: [[swapData, unwrapData]],
  });
}
