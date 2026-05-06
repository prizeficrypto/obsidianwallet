"use client";

import { useState, useMemo, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { useChainBalances, useTotalBalance } from "@/hooks/useChainBalances";
import { useWldBalance } from "@/hooks/useWldBalance";
import { usePortfolioChart } from "@/hooks/usePortfolioChart";

import WelcomeScreen, { EmptyWalletCard } from "./WelcomeScreen";
import OnboardingScreen from "./OnboardingScreen";
import WalletHeader from "./WalletHeader";
import BalanceCard from "./BalanceCard";
import SearchModal from "./SearchModal";
import QuickActions from "./QuickActions";
import ChainList from "./ChainList";
import BridgeView from "./BridgeView";
import BottomNav from "./BottomNav";
import SendModal from "./modals/SendModal";
import ReceiveModal from "./modals/ReceiveModal";
import SettingsScreen from "./screens/SettingsScreen";
import ActivityScreen from "./screens/ActivityScreen";
import PortfolioScreen from "./screens/PortfolioScreen";
import EarnScreen from "./screens/EarnScreen";
import TokenDetailScreen from "./screens/TokenDetailScreen";
import { useReturnValue } from "@/hooks/useReturnValue";
import { useWorldChainTokenBalances } from "@/hooks/useWorldChainTokenBalances";
import MarketsRail from "./MarketsRail";
import type { SelectedToken } from "@/types/token";

type NavTab = "home" | "swap" | "earn" | "activity" | "portfolio" | "settings" | "search";
type Flow = "send" | "receive" | null;

export default function WalletApp() {
  const wallet = useWallet();
  // Onboarding: shown once after first connect, then never again.
  // Start true so returning users never see a flash; useEffect corrects for new users.
  const [onboardingDone, setOnboardingDone] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("strata_onboarded")) {
      setOnboardingDone(false);
    }
  }, []);

  function completeOnboarding() {
    localStorage.setItem("strata_onboarded", "1");
    setOnboardingDone(true);
  }

  const [navTab, setNavTab] = useState<NavTab>("home");
  const [flow, setFlow] = useState<Flow>(null);
  const [selectedToken, setSelectedToken] = useState<SelectedToken | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: prices } = useTokenPrices();
  const { data: balances, isLoading: balancesLoading } = useChainBalances(wallet.address, prices);
  const wldPriceUSD = prices?.["worldcoin-wld"]?.usd ?? 0;
  const { data: wldBalance } = useWldBalance(wallet.address, wldPriceUSD);
  const { data: tokenBalances } = useWorldChainTokenBalances(wallet.address, prices);
  const tokenBalancesUSD = (tokenBalances ?? []).reduce((sum, t) => sum + (Number.isFinite(t.balanceUSD) ? t.balanceUSD : 0), 0);
  const rawTotal = useTotalBalance(balances) + (wldBalance?.usd ?? 0) + tokenBalancesUSD;
  const totalUSD = Number.isFinite(rawTotal) ? rawTotal : 0;

  // Held token contract addresses — used to surface user's tokens first in the swap picker
  const heldAddresses = useMemo(() => {
    const set = new Set<string>();
    if (wldBalance) set.add("0x2cFc85d8E48F8EAB294be644d9E25C3030863003".toLowerCase());
    for (const t of tokenBalances ?? []) set.add(t.contractAddress.toLowerCase());
    return set;
  }, [wldBalance, tokenBalances]);

  // Balance map for swap UI: address.toLowerCase() → human-readable balance
  const balanceMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (wldBalance?.raw) map["0x2cfc85d8e48f8eab294be644d9e25c3030863003"] = Number(wldBalance.raw) / 1e18;
    for (const t of tokenBalances ?? []) map[t.contractAddress.toLowerCase()] = t.balance;
    return map;
  }, [wldBalance, tokenBalances]);
  const isBalanceLoading = balancesLoading || !prices;
  const isEmpty = !isBalanceLoading && totalUSD === 0;

  // Portfolio-wide weighted 24h change — includes WLD + World Chain tokens
  const portfolioChange24h = useMemo(() => {
    if (totalUSD <= 0) return 0;
    let weighted = 0;
    // Native chain balances (ETH on various chains)
    for (const b of balances ?? []) {
      if (b.usdValue > 0) weighted += b.priceChange24h * (b.usdValue / totalUSD);
    }
    // WLD
    const wldUSD = wldBalance?.usd ?? 0;
    if (wldUSD > 0) {
      const wldChange = prices?.["worldcoin-wld"]?.usd_24h_change ?? 0;
      weighted += wldChange * (wldUSD / totalUSD);
    }
    // World Chain ERC-20s (USDC.e, WETH, etc.)
    for (const t of tokenBalances ?? []) {
      if (t.balanceUSD > 0) weighted += t.priceChange24h * (t.balanceUSD / totalUSD);
    }
    return weighted;
  }, [totalUSD, balances, wldBalance, tokenBalances, prices]);

  // 1D portfolio chart for home screen sparkline
  const homeChartHoldings = useMemo(() => {
    const result: import("@/hooks/usePortfolioChart").PortfolioHolding[] = [];
    if (wldBalance) {
      const amt = parseFloat(wldBalance.formatted);
      if (amt > 0) {
        result.push({
          coingeckoId: "worldcoin-wld",
          symbol: "WLD",
          amount: amt,
          contractAddress: "0x2cFc85d8E48F8EAB294be644d9E25C3030863003",
          kind: "erc20",
        });
      }
    }
    for (const b of balances ?? []) {
      if (b.nativeBalance > 0 && b.chain.coingeckoId) {
        result.push({
          coingeckoId: b.chain.coingeckoId,
          symbol: b.chain.symbol,
          amount: b.nativeBalance,
          kind: "native",
        });
      }
    }
    for (const t of tokenBalances ?? []) {
      if (t.balance > 0 && t.coingeckoId) {
        result.push({
          coingeckoId: t.coingeckoId,
          symbol: t.symbol,
          amount: t.balance,
          contractAddress: t.contractAddress,
          kind: "erc20",
        });
      }
    }
    return result;
  }, [wldBalance, balances, tokenBalances]);

  const { data: homeChartData } = usePortfolioChart(homeChartHoldings, 1, wallet.address);

  // Return-value: "since you left" summary
  const { sinceYouLeft } = useReturnValue({
    totalUSD,
    balances,
    wldBalance,
    wldPriceUSD,
    isLoading: isBalanceLoading,
  });

  // No cross-chain token lookup needed — World Chain only.

  if (!wallet.isConnected) {
    return (
      <WelcomeScreen
        onConnect={wallet.connect}
        isLoading={wallet.isLoading}
        isInWorldApp={wallet.isInWorldApp}
        username={wallet.username}
        isConnected={false}
      />
    );
  }

  if (!onboardingDone) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "#0a0a0a", maxWidth: "430px", margin: "0 auto" }}
    >
      {/* Task flows: full-screen replacements — no tab bar rendered */}
      {flow === "send" && wallet.address ? (
        <SendModal
          address={wallet.address}
          isInWorldApp={wallet.isInWorldApp}
          onClose={() => setFlow(null)}
          balanceMap={balanceMap}
        />
      ) : flow === "receive" && wallet.address ? (
        <ReceiveModal address={wallet.address} onClose={() => setFlow(null)} />
      ) : selectedToken ? (
        <TokenDetailScreen
          token={selectedToken}
          username={wallet.username}
          onBack={() => setSelectedToken(null)}
          onSend={() => { setSelectedToken(null); setFlow("send"); }}
          onReceive={() => { setSelectedToken(null); setFlow("receive"); }}
          onSwap={() => { setSelectedToken(null); setNavTab("swap"); }}
        />
      ) : navTab === "settings" ? (
        <SettingsScreen wallet={wallet} onBack={() => setNavTab("home")} />
      ) : (
        <>
          <div className="sticky top-0 z-40">
            <WalletHeader
              username={wallet.username}
              address={wallet.address}
              isOrbVerified={wallet.isOrbVerified}
              onSettingsTap={() => setNavTab("settings")}
              onSearchTap={() => setSearchOpen(true)}
              onActivityTap={() => setNavTab("activity")}
            />
          </div>

          <main className="flex-1 overflow-y-auto pb-20">
            {navTab === "home" && (
              <>
                {isEmpty ? (
                  <EmptyWalletCard
                    username={wallet.username}
                    onDeposit={() => setFlow("receive")}
                    onTransfer={() => setFlow("send")}
                  />
                ) : (
                  <BalanceCard
                    totalUSD={totalUSD}
                    balances={balances}
                    isLoading={isBalanceLoading}
                    address={wallet.address}
                    username={wallet.username}
                    sparklineData={homeChartData ?? null}
                    sinceYouLeft={sinceYouLeft}
                    portfolioChange24h={portfolioChange24h}
                  />
                )}

                <QuickActions
                  onSend={() => setFlow("send")}
                  onReceive={() => setFlow("receive")}
                  onSwap={() => setNavTab("swap")}
                />

                {/* Markets — Trending / Movers / Watchlist with sparklines */}
                <MarketsRail
                  prices={prices}
                  balanceMap={balanceMap}
                  onTokenTap={setSelectedToken}
                  onSeeAll={() => setSearchOpen(true)}
                />

                <ChainList
                  balances={balances}
                  isLoading={isBalanceLoading}
                  address={wallet.address}
                  wldBalance={wldBalance}
                  wldPriceChange={prices?.["worldcoin-wld"]?.usd_24h_change}
                  tokenBalances={tokenBalances}
                  onTokenTap={setSelectedToken}
                />
              </>
            )}

            {navTab === "activity" && (
              <ActivityScreen
                address={wallet.address}
                onBack={() => setNavTab("home")}
              />
            )}

            {navTab === "portfolio" && (
              <PortfolioScreen
                balances={balances}
                wldBalance={wldBalance}
                wldPriceChange={prices?.["worldcoin-wld"]?.usd_24h_change}
                totalUSD={totalUSD}
                isLoading={isBalanceLoading}
                tokenBalances={tokenBalances ?? undefined}
                address={wallet.address}
              />
            )}

            {navTab === "swap" && (
              <BridgeView
                address={wallet.address}
                heldAddresses={heldAddresses}
                balanceMap={balanceMap}
                totalPortfolioUSD={totalUSD}
              />
            )}

            {navTab === "earn" && (
              <EarnScreen
                address={wallet.address}
                wldBalance={wldBalance}
                wldPriceUSD={wldPriceUSD}
              />
            )}
          </main>

          <BottomNav
            activeTab={navTab}
            onTabChange={(t) => {
              if (t === "search") {
                setSearchOpen(true);
              } else {
                setNavTab(t as NavTab);
              }
            }}
          />

          {/* Search overlay — rendered above everything in the main layout */}
          {searchOpen && (
            <SearchModal
              balances={balances}
              wldBalance={wldBalance}
              prices={prices}
              wldPriceChange={prices?.["worldcoin-wld"]?.usd_24h_change}
              onTokenTap={(token) => {
                setSearchOpen(false);
                setSelectedToken(token);
              }}
              onClose={() => setSearchOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
