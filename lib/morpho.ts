/**
 * Morpho lending integration on World Chain (chainId 480).
 *
 * Vault: Re7 WLD — 0x348831b46876d3dF2Db98BdEc5E3B4083329Ab9f
 *
 * This is a curated **MetaMorpho ERC-4626 vault** that auto-allocates
 * deposited WLD across Morpho Blue markets to earn yield. The vault
 * exposes a standard ERC-4626 interface, so the integration boils
 * down to:
 *
 *   • depositToMorpho(amount)   → approve WLD, call vault.deposit(assets, user)
 *   • withdrawFromMorpho(amount) → call vault.withdraw(assets, user, user)
 *   • getMorphoBalance(user)    → shares = balanceOf(user); assets = previewRedeem(shares)
 *
 * Yield auto-compounds via share appreciation: the vault's totalAssets
 * grows as the underlying markets earn interest, so the same shares
 * are worth more over time. There is no claim function.
 */

import { encodeFunctionData } from "viem";

// ── Constants ───────────────────────────────────────────────────────

/** Re7 WLD MetaMorpho vault on World Chain. */
export const MORPHO_VAULT_ADDRESS =
  "0x348831b46876d3dF2Db98BdEc5E3B4083329Ab9f" as const;

/** Underlying asset of the vault — WLD. */
export const WLD_ADDRESS =
  "0x2cFc85d8E48F8EAB294be644d9E25C3030863003" as const;

export const WORLD_CHAIN_ID = 480 as const;

/**
 * Friendly metadata for UI labels. Pulled live from the contract once
 * (asset(), name(), symbol(), decimals()) and pinned here so we don't
 * pay an extra RPC round-trip on every render.
 */
export const VAULT_INFO = {
  name: "Re7 WLD",
  symbol: "Re7WLD",
  decimals: 18,
  asset: { symbol: "WLD", decimals: 18 },
} as const;

// ── ABIs (minimal — only what we call) ──────────────────────────────

/**
 * ERC-4626 vault — standard methods plus the ERC-20 approve view we
 * need to short-circuit redundant approvals.
 */
export const VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "redeem",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "previewRedeem",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    name: "previewWithdraw",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "assets", type: "uint256" }],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "maxWithdraw",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "asset",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "totalAssets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
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

/** vault.deposit(assets, receiver) calldata. */
export function buildVaultDepositCalldata(
  assets: bigint,
  receiver: string,
): `0x${string}` {
  return encodeFunctionData({
    abi: VAULT_ABI,
    functionName: "deposit",
    args: [assets, receiver as `0x${string}`],
  });
}

/** vault.withdraw(assets, receiver, owner) calldata — partial withdraw. */
export function buildVaultWithdrawCalldata(
  assets: bigint,
  receiver: string,
  owner: string,
): `0x${string}` {
  return encodeFunctionData({
    abi: VAULT_ABI,
    functionName: "withdraw",
    args: [assets, receiver as `0x${string}`, owner as `0x${string}`],
  });
}

/**
 * vault.redeem(shares, receiver, owner) calldata — full-position exit.
 * Use this when the user clicks Max so no dust shares are left behind
 * from rounding when assets are converted to shares.
 */
export function buildVaultRedeemCalldata(
  shares: bigint,
  receiver: string,
  owner: string,
): `0x${string}` {
  return encodeFunctionData({
    abi: VAULT_ABI,
    functionName: "redeem",
    args: [shares, receiver as `0x${string}`, owner as `0x${string}`],
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
  if (trimmed === ".") throw new Error("Invalid amount");

  const [whole = "0", frac = ""] = trimmed.split(".");
  if (frac.length > decimals) {
    throw new Error(`Too many decimals — max ${decimals}`);
  }
  const padded = frac.padEnd(decimals, "0");
  const result = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
  if (result <= 0n) throw new Error("Amount must be greater than zero");
  return result;
}
