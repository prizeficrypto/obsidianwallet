/**
 * Morpho Blue integration on World Chain (chainId 480).
 *
 * Contract: 0xe741bc7c34758b4cae05062794e8ae24978af432
 *
 * This is the Morpho Blue *singleton* lending protocol. Each market is
 * identified by an immutable MarketParams tuple
 * (loanToken, collateralToken, oracle, irm, lltv) and indexed by a
 * keccak256 of those fields ("marketId"). Suppliers receive shares;
 * shares accrue value as borrowers pay interest.
 *
 *   • depositToMorpho(amount)   — supply WLD as the loan asset, earn yield
 *   • withdrawFromMorpho(amount) — withdraw underlying WLD (incl. interest)
 *   • getMorphoBalance(user)    — current WLD position with accrued interest
 *
 * Why supply() and not supplyCollateral():
 *   In Morpho Blue, supplyCollateral provides the *collateral* side
 *   of a market — that capital is locked to enable borrowing but does
 *   not earn yield. Yield-earning deposits go through supply(), which
 *   provides the *loan* side. The user's request — "deposit WLD to earn
 *   interest" — is the latter.
 *
 * Why the WETH/WLD market:
 *   Three WLD-loan markets exist on World Chain (queried from the
 *   Morpho API). The idle market is dormant (no IRM). The WETH-collateral
 *   market has the highest live supplyAPY (~2.97% vs WBTC's ~2.09%) and
 *   the deepest liquidity, so it's the default for "deposit WLD".
 *   Switching markets later is a one-line constant change.
 */

import { encodeFunctionData, keccak256, encodeAbiParameters } from "viem";

// ── Constants ───────────────────────────────────────────────────────

export const MORPHO_BLUE_ADDRESS =
  "0xe741bc7c34758b4cae05062794e8ae24978af432" as const;

export const WLD_ADDRESS =
  "0x2cFc85d8E48F8EAB294be644d9E25C3030863003" as const;

export const WORLD_CHAIN_ID = 480 as const;

/**
 * Selected market: WLD loan / WETH collateral, LLTV 86%.
 * Pulled from Morpho's official API for chainId 480; verified on-chain
 * by reading market() and confirming non-zero state.
 */
export const WLD_MARKET = {
  loanToken: WLD_ADDRESS,
  collateralToken: "0x4200000000000000000000000000000000000006", // WETH
  oracle: "0xB7fEBE1d85c82CC868B585Edf9Fa8aF480426bb8",
  irm: "0x34E99D604751a72cF8d0CFDf87069292d82De472",
  lltv: 860000000000000000n, // 86% in WAD (1e18)
} as const;

/**
 * Morpho's SharesMath uses virtual offsets to neutralize the classic
 * first-deposit-vault attack. These constants are baked into the
 * protocol; do not change.
 */
export const VIRTUAL_SHARES = 1_000_000n; // 1e6
export const VIRTUAL_ASSETS = 1n;

/** WAD = 1e18 used for fixed-point math throughout Morpho. */
const WAD = 1_000_000_000_000_000_000n;

// ── Types ───────────────────────────────────────────────────────────

export interface MarketParams {
  loanToken: `0x${string}`;
  collateralToken: `0x${string}`;
  oracle: `0x${string}`;
  irm: `0x${string}`;
  lltv: bigint;
}

/** On-chain Market struct returned by market(id). All fields uint128. */
export interface MarketState {
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  fee: bigint;
}

/** On-chain Position struct returned by position(id, user). */
export interface PositionState {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
}

// ── ABIs (minimal — only what we call) ──────────────────────────────

export const MORPHO_ABI = [
  {
    name: "supply",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [
      { name: "assetsSupplied", type: "uint256" },
      { name: "sharesSupplied", type: "uint256" },
    ],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "receiver", type: "address" },
    ],
    outputs: [
      { name: "assetsWithdrawn", type: "uint256" },
      { name: "sharesWithdrawn", type: "uint256" },
    ],
  },
  {
    name: "position",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "supplyShares", type: "uint256" },
      { name: "borrowShares", type: "uint128" },
      { name: "collateral", type: "uint128" },
    ],
  },
  {
    name: "market",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      { name: "totalSupplyAssets", type: "uint128" },
      { name: "totalSupplyShares", type: "uint128" },
      { name: "totalBorrowAssets", type: "uint128" },
      { name: "totalBorrowShares", type: "uint128" },
      { name: "lastUpdate", type: "uint128" },
      { name: "fee", type: "uint128" },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * Adaptive Curve IRM — Morpho's standard interest rate model. We only
 * need the view variant so balance reads are gas-free.
 */
export const IRM_ABI = [
  {
    name: "borrowRateView",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      {
        name: "market",
        type: "tuple",
        components: [
          { name: "totalSupplyAssets", type: "uint128" },
          { name: "totalSupplyShares", type: "uint128" },
          { name: "totalBorrowAssets", type: "uint128" },
          { name: "totalBorrowShares", type: "uint128" },
          { name: "lastUpdate", type: "uint128" },
          { name: "fee", type: "uint128" },
        ],
      },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── Market ID derivation ────────────────────────────────────────────

/**
 * keccak256(abi.encode(MarketParams)) — the on-chain market identifier.
 * Matches Morpho Blue's MarketParamsLib.id() exactly.
 */
export function marketParamsToId(p: MarketParams): `0x${string}` {
  const encoded = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
    ],
    [p],
  );
  return keccak256(encoded);
}

export const WLD_MARKET_ID = marketParamsToId(WLD_MARKET);

// ── SharesMath — Morpho's mulDiv with virtual offsets ───────────────

/**
 * shares -> assets, rounding *down*. Used for "how much would I get
 * out if I withdraw these shares." Mirrors SharesMathLib.toAssetsDown.
 */
export function sharesToAssetsDown(
  shares: bigint,
  totalAssets: bigint,
  totalShares: bigint,
): bigint {
  return mulDivDown(
    shares,
    totalAssets + VIRTUAL_ASSETS,
    totalShares + VIRTUAL_SHARES,
  );
}

/**
 * assets -> shares, rounding *down*. Used to compute how many shares
 * are minted on supply. Mirrors SharesMathLib.toSharesDown.
 */
export function assetsToSharesDown(
  assets: bigint,
  totalAssets: bigint,
  totalShares: bigint,
): bigint {
  return mulDivDown(
    assets,
    totalShares + VIRTUAL_SHARES,
    totalAssets + VIRTUAL_ASSETS,
  );
}

function mulDivDown(x: bigint, y: bigint, d: bigint): bigint {
  if (d === 0n) return 0n;
  return (x * y) / d;
}

// ── Interest accrual (mirrors Morpho's accrueInterest math) ─────────

/**
 * wTaylorCompounded — third-order Taylor expansion of e^x − 1, where
 * x = ratePerSecond × elapsed. Same approximation Morpho uses on-chain
 * to compound interest cheaply between accruals. All math in WAD.
 */
function wTaylorCompounded(rate: bigint, elapsed: bigint): bigint {
  const x = rate * elapsed;                   // WAD
  const x2 = (x * x) / WAD / 2n;              // x²/2 in WAD
  const x3 = (x2 * x) / WAD / 3n;             // x³/6 in WAD
  return x + x2 + x3;
}

/**
 * Apply interest accrual to a stale Market struct using a freshly read
 * borrow rate. Returns updated totalSupplyAssets/Shares as if
 * accrueInterest() were called at `now`.
 *
 * The fee (if any) mints new supply shares to the protocol's fee
 * recipient — this dilutes existing suppliers, so we account for it
 * correctly here, matching Morpho.accrueInterest().
 */
export function accrueInterestView(
  market: MarketState,
  borrowRate: bigint,
  nowSec: bigint,
): { totalSupplyAssets: bigint; totalSupplyShares: bigint } {
  const elapsed = nowSec - market.lastUpdate;
  if (elapsed === 0n || market.totalBorrowAssets === 0n) {
    return {
      totalSupplyAssets: market.totalSupplyAssets,
      totalSupplyShares: market.totalSupplyShares,
    };
  }

  const interest = mulDivDown(
    market.totalBorrowAssets,
    wTaylorCompounded(borrowRate, elapsed),
    WAD,
  );

  let totalSupplyAssets = market.totalSupplyAssets + interest;
  let totalSupplyShares = market.totalSupplyShares;

  if (market.fee > 0n) {
    const feeAmount = mulDivDown(interest, market.fee, WAD);
    // Fee shares are minted *before* the interest is added to assets,
    // so the recipient receives shares whose value matches feeAmount.
    const feeShares = mulDivDown(
      feeAmount,
      totalSupplyShares + VIRTUAL_SHARES,
      totalSupplyAssets - feeAmount + VIRTUAL_ASSETS,
    );
    totalSupplyShares = totalSupplyShares + feeShares;
  }

  return { totalSupplyAssets, totalSupplyShares };
}

// ── Calldata builders ───────────────────────────────────────────────

/** ERC-20 approve(spender, amount) calldata. */
export function buildApproveCalldata(
  spender: string,
  amount: bigint,
): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender as `0x${string}`, amount],
  });
}

/**
 * Morpho.supply() calldata. Pass either `assets` OR `shares`, never
 * both — Morpho enforces (assets == 0) ^ (shares == 0). For UX where
 * the user types a token amount, pass assets and leave shares=0.
 */
export function buildSupplyCalldata(
  marketParams: MarketParams,
  assets: bigint,
  shares: bigint,
  onBehalf: string,
  data: `0x${string}` = "0x",
): `0x${string}` {
  return encodeFunctionData({
    abi: MORPHO_ABI,
    functionName: "supply",
    args: [marketParams, assets, shares, onBehalf as `0x${string}`, data],
  });
}

/**
 * Morpho.withdraw() calldata. Same exclusivity rule as supply: pass
 * either assets or shares. To withdraw the entire position cleanly,
 * pass shares = position.supplyShares (avoids dust left in shares due
 * to rounding when computing assets).
 */
export function buildWithdrawCalldata(
  marketParams: MarketParams,
  assets: bigint,
  shares: bigint,
  onBehalf: string,
  receiver: string,
): `0x${string}` {
  return encodeFunctionData({
    abi: MORPHO_ABI,
    functionName: "withdraw",
    args: [
      marketParams,
      assets,
      shares,
      onBehalf as `0x${string}`,
      receiver as `0x${string}`,
    ],
  });
}

// ── Input validation ────────────────────────────────────────────────

/**
 * Parse a human-entered decimal amount (e.g. "12.5") into a token-unit
 * bigint, rejecting NaN, negatives, and over-precision. Throws on
 * invalid input — callers should surface the message to the user.
 */
export function parseTokenAmount(input: string, decimals = 18): bigint {
  const trimmed = (input ?? "").trim();
  if (!trimmed) throw new Error("Enter an amount");
  if (!/^\d*\.?\d*$/.test(trimmed)) throw new Error("Invalid amount");
  if (trimmed === "." || trimmed === "") throw new Error("Invalid amount");

  const [whole = "0", frac = ""] = trimmed.split(".");
  if (frac.length > decimals) {
    throw new Error(`Too many decimals — max ${decimals}`);
  }
  const padded = frac.padEnd(decimals, "0");
  const result = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
  if (result <= 0n) throw new Error("Amount must be greater than zero");
  return result;
}
