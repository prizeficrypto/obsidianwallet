"use client";

import { useState, useMemo, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { useChainBalances, useTotalBalance } from "@/hooks/useChainBalances";
import { useWldBalance } from "@/hooks/useWldBalance";

import WelcomeScreen, { EmptyWalletCard } from "./WelcomeScreen";
import OnboardingScreen from "./OnboardingScreen";
import WalletHeader from "./WalletHeader";
import BalanceCard from "./BalanceCard";
import SinceYouLeft from "./SinceYouLeft";
import MoversCard from "./MoversCard";
import WatchlistCard from "./WatchlistCard";
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
import TokenDetailScreen from "./screens/TokenDetailScreen";
import { useReturnValue } from "@/hooks/useReturnValue";
import { useWorldChainTokenBalances } from "@/hooks/useWorldChainTokenBalances";
import type { SelectedToken } from "@/types/token";

type NavTab = "home" | "swap" | "activity" | "portfolio" | "settings";
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
  const tokenBalancesUSD = (tokenBalances ?? []).reduce((sum, t) => sum + t.balanceUSD, 0);
  const totalUSD = useTotalBalance(balances) + (wldBalance?.usd ?? 0) + tokenBalancesUSD;

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

  // Return-value features: "since you left" + movers
  const { sinceYouLeft, movers, dismissBanner, bannerDismissed } = useReturnValue({
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
                  />
                )}

                {/* Return moment — what changed since last visit */}
                {sinceYouLeft && !bannerDismissed && !isEmpty && (
                  <SinceYouLeft
                    data={sinceYouLeft}
                    topMover={movers[0] ?? null}
                    onDismiss={dismissBanner}
                  />
                )}

                <QuickActions
                  onSend={() => setFlow("send")}
                  onReceive={() => setFlow("receive")}
                  onSwap={() => setNavTab("swap")}
                />

                {/* Movers since last visit */}
                {movers.length > 0 && !isEmpty && (
                  <MoversCard movers={movers} />
                )}

                {/* Watchlist */}
                <WatchlistCard onTokenTap={setSelectedToken} />

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
              <ActivityScreen address={wallet.address} />
            )}

            {navTab === "portfolio" && (
              <PortfolioScreen
                balances={balances}
                wldBalance={wldBalance}
                wldPriceChange={prices?.["worldcoin-wld"]?.usd_24h_change}
                totalUSD={totalUSD}
                isLoading={isBalanceLoading}
              />
            )}

            {navTab === "swap" && (
              <BridgeView address={wallet.address} heldAddresses={heldAddresses} balanceMap={balanceMap} />
            )}
          </main>

          <BottomNav
            activeTab={navTab}
            onTabChange={(t) => setNavTab(t as NavTab)}
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
