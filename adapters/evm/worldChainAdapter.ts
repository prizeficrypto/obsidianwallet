import { EvmAdapter } from "./evmAdapter";
import { CHAIN_MAP } from "@/lib/chains/config";

/**
 * World Chain adapter — extends EvmAdapter with World Chain-specific behavior.
 * World Chain is an OP Stack L2 with chainId 480.
 * MiniKit transactions are sent directly (no external wallet needed).
 */
export class WorldChainAdapter extends EvmAdapter {
  constructor() {
    const chain = CHAIN_MAP["world-chain"];
    if (!chain) throw new Error("world-chain not found in config");
    super(chain);
  }

  /** World Chain uses WLD as the primary display token */
  get primaryTokenSymbol(): string {
    return "WLD";
  }

  /** Get World Chain explorer URL for a tx hash */
  getTxUrl(hash: string): string {
    return `${this.chain.blockExplorerUrl}/tx/${hash}`;
  }

  /** Get World Chain explorer URL for an address */
  getAddressUrl(address: string): string {
    return `${this.chain.blockExplorerUrl}/address/${address}`;
  }
}
