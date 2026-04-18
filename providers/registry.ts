import type { ISwapProvider } from "./types";
import { LifiProvider } from "./lifi/lifiProvider";

let _providers: ISwapProvider[] | null = null;

function buildProviders(): ISwapProvider[] {
  return [new LifiProvider()];
}

export function getProviders(): ISwapProvider[] {
  if (!_providers) _providers = buildProviders();
  return _providers;
}

/** Get the best provider for a route (first supported provider wins) */
export function getProviderForRoute(
  fromChainId: string,
  toChainId: string
): ISwapProvider | undefined {
  return getProviders().find((p) => p.supportsRoute(fromChainId, toChainId));
}
