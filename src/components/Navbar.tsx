"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  useApexStore,
  initializeWalletAutoReconnect,
} from "@/store/useApexStore";
import {
  SUPPORTED_NETWORKS,
  formatAddress,
  formatCurrency,
} from "@/lib/web3";
import {
  Wallet,
  ChevronDown,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  Hexagon,
  Menu,
  X,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface NavbarProps {
  onNavInteract?: (tab?: "BUY" | "SELL" | "LEDGER" | "WELCOME") => void;
  activeView?: "EXCHANGE" | "LEDGER";
  activeTab?: "BUY" | "SELL";
  isHeroHidden?: boolean;
  onMobileMenuChange?: (state: "open" | "closing" | "closed") => void;
}

export function Navbar({
  onNavInteract,
  activeView = "EXCHANGE",
  activeTab = "BUY",
  isHeroHidden = false,
  onMobileMenuChange,
}: NavbarProps) {
  const {
    walletAddress,
    isConnected,
    chainId,
    nativeBalance,
    usdtBalance,
    rateConfig,
    setWalletModalOpen,
    disconnectWallet,
    fetchRates,
    fetchUserOrders,
  } = useApexStore();

  const [copied, setCopied] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isClosingMenu, setIsClosingMenu] = useState(false);

  const closeMobileMenu = () => {
    if (isClosingMenu || !mobileMenuOpen) return;
    setIsClosingMenu(true);
    onMobileMenuChange?.("closing");
    setTimeout(() => {
      setMobileMenuOpen(false);
      setIsClosingMenu(false);
      onMobileMenuChange?.("closed");
    }, 400);
  };

  const toggleMobileMenu = () => {
    if (mobileMenuOpen) {
      closeMobileMenu();
    } else {
      setIsClosingMenu(false);
      setMobileMenuOpen(true);
      onMobileMenuChange?.("open");
    }
  };

  // Lock background scrolling while full-screen mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      setMobileMenuOpen(false);
      setIsClosingMenu(false);
      setWalletDropdownOpen(false);
      onMobileMenuChange?.("closed");
    }
  }, [isConnected, walletAddress, onMobileMenuChange]);

  useEffect(() => {
    initializeWalletAutoReconnect();
    fetchRates();

    const interval = setInterval(() => {
      fetchRates();
      fetchUserOrders();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchRates, fetchUserOrders]);

  const activeNetwork =
    SUPPORTED_NETWORKS[chainId] || SUPPORTED_NETWORKS[1];

  const handleCopyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl hive-header-bar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Official Cryptohive SVG Logo */}
        <div className="flex items-center">
          <Link
            href="/"
            aria-label="Cryptohive Home"
            onClick={(e) => {
              e.preventDefault();
              onNavInteract?.("WELCOME");
              setMobileMenuOpen(false);
            }}
            className="flex items-center group cursor-pointer"
          >
            <img
              src="/logo.svg"
              alt="Cryptohive DeFi Crypto Exchange Logo"
              width={44}
              height={44}
              className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-[0_3px_6px_rgba(10,11,14,0.18)] group-hover:scale-105 active:translate-y-0.5 transition-all shrink-0"
            />
          </Link>
        </div>

        {/* Center Live Quote Pill (Hidden on Header per user request) */}

        {/* Right: Connect Wallet & Mobile Hamburger Menu ('En' Badge Removed; Auto-Translated via Location/Google Translate) */}
        <div className="flex items-center gap-2.5">
          {/* Connect Wallet or Connected Pill */}
          {!isConnected || !walletAddress ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setWalletModalOpen(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setWalletModalOpen(true);
              }}
              className="flex items-center gap-2 pl-1.5 pr-4 sm:pr-5 py-1.5 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-[#FFC700] flex items-center justify-center text-black shrink-0">
                <Wallet className="w-3.5 h-3.5 stroke-[2.4]" />
              </span>
              <span className="whitespace-nowrap">Connect Wallet</span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-[#0A0B0E] hover:bg-zinc-900 text-white transition-all shadow-md"
              >
                <span className="w-7 h-7 rounded-full bg-[#FFC700] flex items-center justify-center text-black font-bold text-[11px] shrink-0">
                  <Wallet className="w-3.5 h-3.5 stroke-[2.3]" />
                </span>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-mono">
                  <span className="text-[#FFC700] font-bold">
                    {usdtBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-zinc-300 text-[10px]">USDT</span>
                </div>
                <span className="text-xs font-mono font-semibold text-white">
                  {formatAddress(walletAddress)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {walletDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-3xl hive-obsidian-card border border-[#FFC700]/30 shadow-2xl p-5 z-50 space-y-3.5 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Connected Wallet
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FFC700]/20 text-[#FFC700] font-bold">
                      {activeNetwork.shortName} Active
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-white font-bold">
                        {formatAddress(walletAddress)}
                      </span>
                      <button
                        onClick={handleCopyAddress}
                        className="flex items-center gap-1 text-[11px] text-[#FFC700] hover:underline font-semibold"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="pt-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Balance</span>
                      <span className="font-mono font-bold text-[#FFC700]">
                        {usdtBalance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        USDT
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Native Gas</span>
                      <span className="font-mono text-zinc-200">
                        {nativeBalance} {activeNetwork.nativeCurrency.symbol}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        useApexStore.getState().syncWalletBalances();
                        setWalletDropdownOpen(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sync
                    </button>
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setWalletDropdownOpen(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold text-rose-300 border border-rose-500/30 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hamburger Menu Button (Shown Only on Mobile When Wallet Is Connected) */}
          {isConnected && Boolean(walletAddress) && (
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="md:hidden p-2.5 rounded-full bg-[#FFC700] text-[#0A0B0E] hover:bg-[#ffcf26] transition-all active:scale-95 shadow-md"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen && !isClosingMenu ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Full-Screen Mobile Overlay with Apple Mac Genie In/Out Effect (Solid White Background) */}
      {isConnected && Boolean(walletAddress) && mobileMenuOpen && (
        <div
          className={`fixed inset-0 z-50 md:hidden w-full h-[100dvh] bg-white text-[#0A0B0E] flex flex-col overflow-y-auto px-5 sm:px-7 pt-4 pb-6 shadow-2xl ${
            isClosingMenu
              ? "animate-genieOut pointer-events-none"
              : "animate-genieIn"
          }`}
        >
          {/* Top Bar inside overlay: aligned with header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 shrink-0">
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                closeMobileMenu();
                setTimeout(() => onNavInteract?.("WELCOME"), 200);
              }}
              className="flex items-center group cursor-pointer"
            >
              <img
                src="/logo.svg"
                alt="Cryptohive Logo"
                width={38}
                height={38}
                className="w-9 h-9 object-contain drop-shadow group-hover:scale-105 transition-transform"
              />
            </Link>

            {/* The X Close Button (Genie origin anchor) */}
            <button
              type="button"
              onClick={closeMobileMenu}
              className="p-2.5 rounded-full bg-[#0A0B0E] text-[#FFC700] hover:bg-zinc-800 transition-all active:scale-90 shadow-md"
              aria-label="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Middle Body: Wallet Details, Live Rates, and Big Tactile Action Buttons */}
          <div className="flex-1 flex flex-col justify-center py-2 space-y-3 max-w-md mx-auto w-full overflow-y-auto min-h-0">
            {/* Connected Wallet Summary Card */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F7F8FA] border border-black/5 space-y-2 hive-field-card shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium">Connected Wallet</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FFC700]/25 text-[#92400E] font-bold">
                  {activeNetwork.shortName} Active
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#0A0B0E] font-bold">
                  {formatAddress(walletAddress)}
                </span>
                <span className="font-mono font-extrabold text-[#0A0B0E]">
                  {usdtBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  <strong className="text-[#B45309]">USDT</strong>
                </span>
              </div>
            </div>

            {/* Live OTC Rates Pill */}
            {rateConfig && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FFFDF6] border border-[#FDE68A] text-xs shrink-0">
                <span className="font-bold text-[#B45309] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
                  Live OTC Rates
                </span>
                <div className="font-mono space-x-3 text-right">
                  <span className="text-zinc-500">
                    Buy:{" "}
                    <strong className="text-[#0A0B0E]">
                      {formatCurrency(
                        rateConfig.buyRate,
                        rateConfig.fiatSymbol
                      )}
                    </strong>
                  </span>
                  <span className="text-zinc-500">
                    Sell:{" "}
                    <strong className="text-[#0A0B0E]">
                      {formatCurrency(
                        rateConfig.sellRate,
                        rateConfig.fiatSymbol
                      )}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* Large Full-Width Tactile Buttons */}
            <div className="space-y-2.5 pt-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  setTimeout(() => onNavInteract?.("BUY"), 180);
                }}
                className={`w-full py-3.5 px-6 rounded-2xl text-sm font-extrabold transition-all flex items-center justify-between shadow-md active:scale-[0.98] ${
                  isHeroHidden && activeView === "EXCHANGE" && activeTab === "BUY"
                    ? "bg-[#0A0B0E] text-[#FFC700] ring-2 ring-[#FFC700]"
                    : "bg-[#FFC700] hover:bg-[#ffcf26] text-[#0A0B0E]"
                }`}
              >
                <span>Buy Crypto</span>
                <ArrowRight className="w-4 h-4 text-[#0A0B0E]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  setTimeout(() => onNavInteract?.("SELL"), 180);
                }}
                className={`w-full py-3.5 px-6 rounded-2xl text-sm font-extrabold transition-all flex items-center justify-between shadow-md active:scale-[0.98] ${
                  isHeroHidden && activeView === "EXCHANGE" && activeTab === "SELL"
                    ? "bg-[#0A0B0E] text-[#FFC700] ring-2 ring-[#FFC700]"
                    : "bg-[#0A0B0E] hover:bg-zinc-800 text-[#FFC700]"
                }`}
              >
                <span>Sell USDT</span>
                <ArrowRight className="w-4 h-4 text-[#FFC700]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  setTimeout(() => onNavInteract?.("LEDGER"), 180);
                }}
                className={`w-full py-3.5 px-6 rounded-2xl text-sm font-extrabold transition-all flex items-center justify-between shadow-sm active:scale-[0.98] ${
                  isHeroHidden && activeView === "LEDGER"
                    ? "bg-[#0A0B0E] text-[#FFC700] ring-2 ring-[#FFC700]"
                    : "bg-[#FFF8DB] hover:bg-[#FDE68A] text-[#0A0B0E] border border-[#FDE68A]"
                }`}
              >
                <span>Transaction History</span>
                <ArrowRight className="w-4 h-4 text-[#0A0B0E]" />
              </button>
            </div>
          </div>

          {/* Footer: Social Channels (X, Telegram, Email), & Treasury Status */}
          <div className="pt-3 pb-1 border-t border-zinc-100 shrink-0 space-y-2.5 max-w-md mx-auto w-full">
            {/* Social & Support Channels (X, Telegram, Email) */}
            <div className="flex items-center justify-center gap-3">
              <a
                href="https://x.com/crypt0hive"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-[#FFC700] flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm"
                title="Follow on X (@crypt0hive)"
                aria-label="X (formerly Twitter)"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              <a
                href="https://t.me/crypt0hive"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-[#FFC700] flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm"
                title="Telegram Support Desk (@crypt0hive)"
                aria-label="Telegram"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.63 3.73-.53.37-1.02.55-1.45.54-.48-.01-1.4-.27-2.09-.49-.84-.27-1.51-.42-1.45-.88.03-.24.38-.49 1.04-.75 4.07-1.77 6.78-2.94 8.14-3.51 3.87-1.61 4.67-1.89 5.2-.1.02.04.03.09.03.14z" />
                </svg>
              </a>

              <a
                href="mailto:cryptohiveng@gmail.com"
                className="w-8 h-8 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-[#FFC700] flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm"
                title="Email Desk (cryptohiveng@gmail.com)"
                aria-label="Email"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </a>
            </div>

            {/* Treasury Status & Copyright */}
            <div className="flex flex-col items-center justify-center gap-1 text-[10px] text-zinc-400">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF8DB] text-[#B45309] font-bold border border-[#FDE68A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" />
                <span>Settlement Engine Online (100% Uptime)</span>
              </div>
              <span className="text-zinc-400 font-medium">
                © 2026 Cryptohive DeFi • Non-Custodial Protocol
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
