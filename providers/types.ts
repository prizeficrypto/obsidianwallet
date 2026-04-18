import type { Token } from "@/types/token";
import type { SwapQuote, SwapQuoteParams, SwapTx } from "@/types/swap";

export interface ISwapProvider {
  id: string;
  name: string;
  supportedChains: string[];   // our chain ID strings

  supportsRoute(fromChainId: string, toChainId: string): boolean;
  getQuote(params: SwapQuoteParams): Promise<SwapQuote | null>;
  buildTx(quote: SwapQuote): Promise<SwapTx | null>;
  getTokens(chainId: string): Promise<Token[]>;
}
