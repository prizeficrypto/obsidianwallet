import { NextResponse } from "next/server";

/**
 * Returns live state for the Re7 WLD MetaMorpho vault — most importantly
 * the net APY, which the protocol tracks off-chain. We proxy the Morpho
 * GraphQL API so the browser doesn't have to (CORS-free, cached).
 */

const VAULT_ADDRESS = "0x348831b46876d3dF2Db98BdEc5E3B4083329Ab9f";
const CHAIN_ID = 480;
const CACHE_TTL_MS = 60_000;
const STALE_TTL_MS = 600_000;

interface CachedEntry {
  data: VaultStatePayload;
  at: number;
}

export interface VaultStatePayload {
  /** Net APY as a fraction (0.0209 = 2.09%) — already nets the curator fee. */
  netApy: number;
  /** Total deposits in the vault, in WLD (token units, not wei). */
  totalAssets: number;
  /** USD value of TVL. */
  totalAssetsUsd: number;
  /** Curator fee fraction (0.1 = 10%). */
  fee: number;
}

const cache = new Map<string, CachedEntry>();

export async function GET() {
  const key = `${CHAIN_ID}:${VAULT_ADDRESS.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.data);
  }

  try {
    const res = await fetch("https://blue-api.morpho.org/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        query: `{ vaultByAddress(address: "${VAULT_ADDRESS}", chainId: ${CHAIN_ID}) { state { totalAssets totalAssetsUsd netApy fee } asset { decimals } } }`,
      }),
    });
    if (!res.ok) throw new Error(`morpho api ${res.status}`);
    const json = await res.json();
    const v = json?.data?.vaultByAddress;
    if (!v) throw new Error("vault not found");

    const decimals = v.asset?.decimals ?? 18;
    const data: VaultStatePayload = {
      netApy: typeof v.state?.netApy === "number" ? v.state.netApy : 0,
      totalAssets: Number(v.state?.totalAssets ?? 0) / 10 ** decimals,
      totalAssetsUsd: typeof v.state?.totalAssetsUsd === "number"
        ? v.state.totalAssetsUsd
        : 0,
      fee: typeof v.state?.fee === "number" ? v.state.fee : 0,
    };

    cache.set(key, { data, at: Date.now() });
    return NextResponse.json(data);
  } catch {
    if (hit && Date.now() - hit.at < STALE_TTL_MS) {
      return NextResponse.json(hit.data);
    }
    return NextResponse.json({
      netApy: 0,
      totalAssets: 0,
      totalAssetsUsd: 0,
      fee: 0,
    } satisfies VaultStatePayload);
  }
}
