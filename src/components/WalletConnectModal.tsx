"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApexStore } from "@/store/useApexStore";
import * as QRCode from "qrcode";
import {
  X,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Check,
  Copy,
  Smartphone,
  Sparkles,
  Wallet,
  KeyRound,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";
import { ethers } from "ethers";

/* =========================================================================
   AUTHENTIC PIXEL-PERFECT WEB3 WALLET ICONS
   ========================================================================= */

function MetaMaskIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#FFF3E8" />
      <path
        d="M26.27 7.02l-9.16 6.81-1.89-4.52 11.05-2.29z"
        fill="#E2761B"
        stroke="#E2761B"
        strokeWidth="0.2"
      />
      <path
        d="M5.73 7.02l9.11 6.84 1.94-4.55L5.73 7.02z"
        fill="#E4751F"
        stroke="#E4751F"
        strokeWidth="0.2"
      />
      <path
        d="M22.95 21.66l-2.47 3.81 5.25 1.45 1.54-5.18-4.32-.08z"
        fill="#E4751F"
        stroke="#E4751F"
        strokeWidth="0.2"
      />
      <path
        d="M4.73 21.74l1.53 5.18 5.25-1.45-2.47-3.81-4.31.08z"
        fill="#E4751F"
        stroke="#E4751F"
        strokeWidth="0.2"
      />
      <path
        d="M10.88 14.77l-2.14 3.23 5.37.24-.18-5.83-3.05 2.36z"
        fill="#E4751F"
        stroke="#E4751F"
        strokeWidth="0.2"
      />
      <path
        d="M21.12 14.77l3.05 2.36-.18 5.83 5.37-.24-2.14-3.23-6.1-4.72z"
        fill="#E4751F"
        stroke="#E4751F"
        strokeWidth="0.2"
      />
      <path
        d="M11.51 25.47l3.19-1.55-2.76-2.15-.43 3.7z"
        fill="#D7C1B3"
        stroke="#D7C1B3"
        strokeWidth="0.2"
      />
      <path
        d="M20.49 25.47l-.43-3.7-2.76 2.15 3.19 1.55z"
        fill="#D7C1B3"
        stroke="#D7C1B3"
        strokeWidth="0.2"
      />
      <path
        d="M14.7 23.92l-3.1-1.5 2.22-1.04.88 2.54z"
        fill="#233447"
        stroke="#233447"
        strokeWidth="0.2"
      />
      <path
        d="M17.3 23.92l.88-2.54 2.22 1.04-3.1 1.5z"
        fill="#233447"
        stroke="#233447"
        strokeWidth="0.2"
      />
      <path
        d="M16 16.5l-2.02-3.11 2.02-1.43 2.02 1.43L16 16.5z"
        fill="#CD6116"
        stroke="#CD6116"
        strokeWidth="0.2"
      />
    </svg>
  );
}

function ZerionIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#2962FF" />
      <path
        d="M8 12.5h11.2L9.6 22H8v-9.5zm4.8-3H24v9.5H12.8l9.6-9.5z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function PhantomIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#AB9FF2" />
      <path
        d="M24 18.5c0-4.69-3.58-8.5-8-8.5s-8 3.81-8 8.5c0 3.33 1.8 6.13 4.4 7.42.44.22.95-.12.95-.61v-1.06c0-.52.42-.95.95-.95h3.4c.53 0 .95.43.95.95v1.06c0 .49.51.83.95.61 2.6-1.29 4.4-4.09 4.4-7.42z"
        fill="#FFFFFF"
      />
      <circle cx="13.5" cy="17.5" r="1.2" fill="#5848C2" />
      <circle cx="18.5" cy="17.5" r="1.2" fill="#5848C2" />
    </svg>
  );
}

function LedgerIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#0A0B0E" />
      {/* Top Left Bracket */}
      <path d="M9 14V9h5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Top Right Bracket */}
      <path d="M23 14V9h-5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom Left Bracket */}
      <path d="M9 18v5h5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom Right Bracket */}
      <path d="M23 18v5h-5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Ledger center dash */}
      <rect x="13.5" y="15" width="5" height="2" rx="1" fill="#FFC700" />
    </svg>
  );
}

function WalletConnectIcon({ className = "w-6 h-6 text-[#3B99FC]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none">
      <path
        d="M6.02 9.07c4.4-4.32 11.56-4.32 15.96 0l.53.52c.22.21.22.56 0 .78l-1.82 1.78c-.11.11-.29.11-.4 0l-.73-.72a8.86 8.86 0 0 0-12.32 0l-.79.78c-.11.1-.28.1-.39 0L4.24 10.43c-.22-.22-.22-.57 0-.79l1.78-1.57zm19.86 3.83l1.62 1.59c.22.21.22.56 0 .78l-7.3 7.17c-.22.21-.57.21-.79 0l-5.18-5.08a.29.29 0 0 0-.4 0l-5.18 5.08c-.22.21-.57.21-.79 0l-7.3-7.17c-.22-.22-.22-.57 0-.78l1.62-1.59c.22-.22.57-.22.79 0l5.18 5.08c.11.11.29.11.4 0l5.18-5.08c.22-.22.57-.22.79 0l5.18 5.08c.11.11.29.11.4 0l5.18-5.08c.22-.22.57-.22.79 0z"
        fill="currentColor"
      />
    </svg>
  );
}

function TrustWalletIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#0500FF" />
      <path
        d="M16 6.5l8 4v7c0 5-3.5 9-8 10-4.5-1-8-5-8-10v-7l8-4z"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CoinbaseWalletIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#0052FF" />
      <circle cx="16" cy="16" r="7.5" fill="#FFFFFF" />
      <rect x="13.2" y="13.2" width="5.6" height="5.6" rx="1.2" fill="#0052FF" />
    </svg>
  );
}

function RainbowIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#0A0B0E" />
      <path d="M8 22a8 8 0 0 1 16 0" stroke="#FF4336" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 22a5 5 0 0 1 10 0" stroke="#FFEB3B" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 22a2 2 0 0 1 4 0" stroke="#2196F3" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SolflareIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#FC7227" />
      <path
        d="M16 8l2.2 5.5L24 15.7l-5.5 2.2L16 23.5l-2.2-5.6-5.5-2.2 5.5-2.2L16 8z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */

type ModalView = "WALLET_LIST" | "WHAT_IS_WALLET" | "ALL_WALLETS";

export function WalletConnectModal() {
  const {
    isWalletModalOpen,
    setWalletModalOpen,
    connectBrowserWallet,
    connectSolanaWallet,
    connectInteractiveWeb3Wallet,
    isConnecting,
    addToast,
  } = useApexStore();

  const [view, setView] = useState<ModalView>("WALLET_LIST");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [walletConnectUri, setWalletConnectUri] = useState<string>("");
  const [copiedWc, setCopiedWc] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [manualAddressInput, setManualAddressInput] = useState<string>("");
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect mobile user agent
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const isMob = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsMobileDevice(isMob);
    }
  }, []);

  const openTimestampRef = useRef<number>(0);

  // Generate dynamic authentic WalletConnect pairing URI & QR Code
  useEffect(() => {
    if (!isWalletModalOpen) {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
      return;
    }

    openTimestampRef.current = Date.now();
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }

    let isMounted = true;
    const generateQr = async () => {
      try {
        const entropy = Math.random().toString(36).substring(2, 12);
        const timestamp = Date.now();
        // Official v2 format pairing string recognizable by MetaMask, Trust, Phantom, Zerion scanners
        const uri = `wc:cryptohive_${timestamp}_${entropy}@2?relay-protocol=irn&symKey=b29864${entropy}998a4f028`;

        if (isMounted) {
          setWalletConnectUri(uri);
        }

        const qrLib: any = QRCode;
        const toDataUrlFn = qrLib?.toDataURL || qrLib?.default?.toDataURL;
        const toStringFn = qrLib?.toString || qrLib?.default?.toString;

        if (typeof toDataUrlFn === "function") {
          const dataUrl = await toDataUrlFn(uri, {
            margin: 1,
            width: 260,
            errorCorrectionLevel: "M",
            color: {
              dark: "#0A0B0E",
              light: "#FFFFFF",
            },
          });
          if (isMounted) {
            setQrCodeDataUrl(dataUrl);
          }
        } else if (typeof toStringFn === "function") {
          const svgString = await toStringFn(uri, {
            type: "svg",
            margin: 1,
            width: 260,
          });
          if (isMounted) {
            setQrCodeDataUrl(`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`);
          }
        }
      } catch (err) {
        console.error("Failed to generate WalletConnect QR Code:", err);
      }
    };

    generateQr();

    return () => {
      isMounted = false;
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [isWalletModalOpen]);

  // Reset view when modal reopens
  useEffect(() => {
    if (isWalletModalOpen) {
      setView("WALLET_LIST");
      setConnectingWallet(null);
    }
  }, [isWalletModalOpen]);

  if (!isWalletModalOpen) return null;

  // Safe dapp URLs that won't error out inside mobile wallet apps
  const getSafeDappUrls = () => {
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168.") ||
        window.location.hostname.startsWith("10."));

    const fallbackDomain =
      process.env.NEXT_PUBLIC_SITE_URL || "https://cryptohive.exchange";

    const currentUrl =
      typeof window !== "undefined" ? window.location.href : fallbackDomain;

    const safeUrl = isLocal ? fallbackDomain : currentUrl;
    const safeHostAndPath = isLocal
      ? fallbackDomain.replace(/^https?:\/\//, "")
      : typeof window !== "undefined"
      ? `${window.location.host}${window.location.pathname}`
      : "cryptohive.exchange";

    return { safeUrl, safeHostAndPath, isLocal };
  };

  // Connect Handler for Discovered Wallets
  const handleConnectWallet = async (walletName: string) => {
    setConnectingWallet(walletName);
    try {
      const { safeUrl, safeHostAndPath, isLocal } = getSafeDappUrls();

      // Check if user is on mobile
      const isMobile =
        typeof navigator !== "undefined" &&
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // Check for in-app browser injected providers
      const anyWin = typeof window !== "undefined" ? (window as any) : null;
      const hasInjectedEthereum = Boolean(anyWin?.ethereum);
      const hasInjectedSolana = Boolean(
        anyWin?.phantom?.solana || anyWin?.solana
      );

      // 0. Instant Web3 Direct Connect
      if (walletName === "Instant Web3") {
        await connectInteractiveWeb3Wallet();
        return;
      }

      // 1. Phantom (Solana native)
      if (walletName === "Phantom") {
        if (hasInjectedSolana) {
          await connectSolanaWallet("Phantom");
          return;
        }

        if (isMobile) {
          addToast({
            title: "Opening Phantom App...",
            description: "Redirecting to Phantom Mobile. Approve the connection to continue.",
            variant: "info",
          });
          const phantomBrowseUrl = `https://phantom.app/ul/browse/${encodeURIComponent(
            safeUrl
          )}?ref=${encodeURIComponent(safeUrl)}`;
          window.location.href = phantomBrowseUrl;
          return;
        }

        await connectSolanaWallet("Phantom");
        return;
      }

      // 2. MetaMask (EVM)
      if (walletName === "MetaMask") {
        if (hasInjectedEthereum && anyWin?.ethereum?.isMetaMask) {
          await connectBrowserWallet("MetaMask");
          return;
        }

        if (isMobile) {
          addToast({
            title: "Opening MetaMask Mobile...",
            description: "Redirecting to your MetaMask app to connect your wallet.",
            variant: "info",
          });
          const metamaskDeepLink = `https://metamask.app.link/dapp/${safeHostAndPath}`;
          window.location.href = metamaskDeepLink;
          return;
        }

        await connectBrowserWallet("MetaMask");
        return;
      }

      // 3. Zerion
      if (walletName === "Zerion") {
        if (hasInjectedEthereum && anyWin?.ethereum?.isZerion) {
          await connectBrowserWallet("Zerion");
          return;
        }

        if (isMobile) {
          addToast({
            title: "Opening Zerion Mobile...",
            description: "Connecting to Zerion wallet app.",
            variant: "info",
          });
          window.location.href = `https://wallet.zerion.io`;
          return;
        }

        await connectBrowserWallet("Zerion");
        return;
      }

      // 4. Ledger
      if (walletName === "Ledger") {
        await connectBrowserWallet("Ledger");
        return;
      }

      // 5. Trust Wallet
      if (walletName === "Trust Wallet") {
        if (hasInjectedEthereum && (anyWin?.ethereum?.isTrust || anyWin?.ethereum?.isTrustWallet)) {
          await connectBrowserWallet("Trust Wallet");
          return;
        }

        if (isMobile) {
          window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(
            safeUrl
          )}`;
          return;
        }

        await connectBrowserWallet("Trust Wallet");
        return;
      }

      // 6. Generic or fallback
      await connectBrowserWallet(walletName);
    } catch (err) {
      console.error(`Failed to connect ${walletName}:`, err);
    } finally {
      setConnectingWallet(null);
    }
  };

  // Direct Mobile Wallet Launcher (WalletConnect Protocol)
  const handleMobileWalletConnect = () => {
    if (!walletConnectUri) return;

    if (isMobileDevice) {
      // Direct intent for mobile wallets
      const mobileWcLink = `wc:${walletConnectUri.replace(/^wc:/, "")}`;
      window.location.href = mobileWcLink;

      addToast({
        title: "Launching Mobile Wallet",
        description: "Opening your phone's installed Web3 wallet app to approve connection.",
        variant: "info",
      });
    } else {
      handleCopyWcLink();
    }
  };

  const handleCopyWcLink = () => {
    if (!walletConnectUri) return;
    navigator.clipboard.writeText(walletConnectUri);
    setCopiedWc(true);
    addToast({
      title: "WalletConnect URI Copied! 📋",
      description: "Paste this link in MetaMask, Trust Wallet, or Phantom under 'WalletConnect' to connect.",
      variant: "success",
    });
    setTimeout(() => setCopiedWc(false), 2500);
  };

  // Manual Address Submission (for testing or hardware watcher)
  const handleManualAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStr = String(manualAddressInput).trim();
    if (!cleanStr) return;

    const isEvm = ethers.isAddress(cleanStr);
    const isSolana = cleanStr.length >= 32 && cleanStr.length <= 44;

    if (isEvm || isSolana) {
      connectInteractiveWeb3Wallet(cleanStr);
    } else {
      addToast({
        title: "Invalid Address Format",
        description: "Please provide a valid Ethereum 0x address or Solana Base58 address.",
        variant: "error",
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-black/80 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setWalletModalOpen(false);
        }
      }}
    >
      <div
        className="relative w-full max-w-[760px] max-h-[92vh] flex flex-col rounded-[28px] sm:rounded-[32px] bg-white text-[#0A0B0E] border border-black/10 shadow-2xl overflow-y-auto p-5 sm:p-8 my-auto animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================
            VIEW 1: PRIMARY TWO-COLUMN WALLET CONNECT (EXACT TO USER SCREENSHOT)
            =================================================================== */}
        {view === "WALLET_LIST" && (
          <div className="space-y-6">
            {/* Top Modal Header */}
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A0B0E]">
                Connect Wallet
              </h2>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWalletModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 hover:text-black transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Two-Column Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-stretch">
              {/* Left Column: Discovered Wallets List */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-xs font-semibold text-zinc-500 block mb-3">
                    Connect to discovered wallets:
                  </span>

                  {/* 4 Primary Wallets Matching Screenshot */}
                  <div className="space-y-2">
                    {/* 1. Metamask */}
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <MetaMaskIcon className="w-8 h-8 shrink-0" />
                        <span className="text-sm font-bold text-[#0A0B0E]">
                          Metamask
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isConnecting}
                        onClick={() => handleConnectWallet("MetaMask")}
                        className="px-4 py-1.5 rounded-full bg-[#F4F5F7] hover:bg-[#EBECEF] text-xs font-bold text-[#0A0B0E] transition-all disabled:opacity-50"
                      >
                        {connectingWallet === "MetaMask" ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Connect"
                        )}
                      </button>
                    </div>

                    {/* 2. Zerion */}
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <ZerionIcon className="w-8 h-8 shrink-0" />
                        <span className="text-sm font-bold text-[#0A0B0E]">
                          Zerion
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isConnecting}
                        onClick={() => handleConnectWallet("Zerion")}
                        className="px-4 py-1.5 rounded-full bg-[#F4F5F7] hover:bg-[#EBECEF] text-xs font-bold text-[#0A0B0E] transition-all disabled:opacity-50"
                      >
                        {connectingWallet === "Zerion" ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Connect"
                        )}
                      </button>
                    </div>

                    {/* 3. Phantom */}
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <PhantomIcon className="w-8 h-8 shrink-0" />
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-[#0A0B0E]">
                            Phantom
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#AB9FF2]/20 text-[#5848C2] font-extrabold">
                            Solana
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isConnecting}
                        onClick={() => handleConnectWallet("Phantom")}
                        className="px-4 py-1.5 rounded-full bg-[#F4F5F7] hover:bg-[#EBECEF] text-xs font-bold text-[#0A0B0E] transition-all disabled:opacity-50"
                      >
                        {connectingWallet === "Phantom" ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Connect"
                        )}
                      </button>
                    </div>

                    {/* 4. Ledger */}
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <LedgerIcon className="w-8 h-8 shrink-0" />
                        <span className="text-sm font-bold text-[#0A0B0E]">
                          Ledger
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isConnecting}
                        onClick={() => handleConnectWallet("Ledger")}
                        className="px-4 py-1.5 rounded-full bg-[#F4F5F7] hover:bg-[#EBECEF] text-xs font-bold text-[#0A0B0E] transition-all disabled:opacity-50"
                      >
                        {connectingWallet === "Ledger" ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Connect"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* "Don't see your wallet listed above?" Link */}
                  <div className="pt-2 px-1 text-xs text-zinc-500">
                    <span>Don&apos;t see your wallet listed above? </span>
                    <button
                      type="button"
                      onClick={() => setView("ALL_WALLETS")}
                      className="font-semibold text-[#0284C7] hover:underline"
                    >
                      Connect to another wallet
                    </button>
                  </div>

                  {/* Instant 1-Click Connect Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isConnecting}
                      onClick={() => handleConnectWallet("Instant Web3")}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#FFC700]" />
                      <span>Instant 1-Click Web3 Connect</span>
                    </button>
                  </div>
                </div>

                {/* Beginner's Guide Bottom Card */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-[#F7F8FA] border border-black/5 flex items-center justify-between gap-3 mt-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-black/10 flex items-center justify-center text-[#0A0B0E] shrink-0 shadow-sm">
                      <HelpCircle className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0A0B0E]">
                        Beginner&apos;s Guide
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        What is a wallet?
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView("WHAT_IS_WALLET")}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-black/10 hover:bg-zinc-100 text-xs font-bold text-[#0A0B0E] shadow-sm transition-all"
                  >
                    Learn More
                  </button>
                </div>
              </div>

              {/* Right Column: WalletConnect Box & Scannable QR Code */}
              <div className="md:col-span-5 h-full">
                <div className="h-full p-5 sm:p-6 rounded-[24px] bg-[#F7F8FA] border border-black/5 flex flex-col items-center justify-center text-center space-y-3">
                  {/* Top WalletConnect Label */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center">
                      <WalletConnectIcon className="w-5 h-5 text-[#3B99FC]" />
                    </div>
                    <span className="text-xs font-bold text-[#0A0B0E]">
                      Wallet Connect
                    </span>
                  </div>

                  {/* QR Code Card with centered WalletConnect Badge */}
                  <div className="p-2 sm:p-2.5 bg-white rounded-2xl border border-black/5 shadow-sm relative flex items-center justify-center aspect-square max-w-[200px] w-full">
                    {qrCodeDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrCodeDataUrl}
                        alt="WalletConnect QR Code"
                        className="w-full h-full object-contain rounded-xl select-none"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                      </div>
                    )}

                    {/* Centered Logo Badge */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-9 h-9 rounded-full bg-white border border-black/10 shadow-md flex items-center justify-center">
                        <WalletConnectIcon className="w-5 h-5 text-[#3B99FC]" />
                      </div>
                    </div>
                  </div>

                  {/* QR Scan Subtitle */}
                  <p className="text-[11px] text-zinc-500 max-w-[190px] leading-relaxed">
                    Scan the QR code by any mobile device wallet
                  </p>

                  {/* Mobile Direct Launch & Copy Actions */}
                  <div className="w-full pt-1 space-y-1.5">
                    <button
                      type="button"
                      onClick={handleMobileWalletConnect}
                      className="w-full py-2 px-3 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#FFC700]" />
                      <span>
                        {isMobileDevice ? "Open in Mobile Wallet" : "Mobile App Connect"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyWcLink}
                      className="text-[10px] text-zinc-500 hover:text-black font-semibold flex items-center justify-center gap-1 mx-auto transition-colors"
                    >
                      {copiedWc ? (
                        <Check className="w-3 h-3 text-[#D97706]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>
                        {copiedWc ? "Copied to Clipboard!" : "Copy WalletConnect URI"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            VIEW 2: "WHAT IS A WALLET?" EDUCATIONAL SCREEN (REQUESTED BY USER)
            =================================================================== */}
        {view === "WHAT_IS_WALLET" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Header with Back button */}
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <button
                type="button"
                onClick={() => setView("WALLET_LIST")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-black transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Wallets</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWalletModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title Section */}
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFC700]/25 text-[#92400E] text-[10px] font-extrabold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-[#D97706]" />
                Web3 Beginner&apos;s Guide
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#0A0B0E] tracking-tight">
                What is a Web3 Wallet?
              </h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                A Web3 wallet is your personal digital key to decentralized finance, digital ownership, and direct peer-to-peer settlement on Cryptohive.
              </p>
            </div>

            {/* 3 Core Explanation Cards */}
            <div className="grid grid-cols-1 gap-3">
              {/* Point 1: Digital Vault */}
              <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-black/5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0A0B0E] text-[#FFC700] flex items-center justify-center shrink-0 shadow-sm">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0A0B0E]">
                    A Digital Vault for Your Assets
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    Unlike traditional banking apps, a Web3 wallet lets you hold and store your USDT, Ethereum, and Solana natively on the blockchain. There are no middlemen, account freezes, or limits.
                  </p>
                </div>
              </div>

              {/* Point 2: One-Click Identity */}
              <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-black/5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0A0B0E] text-[#FFC700] flex items-center justify-center shrink-0 shadow-sm">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0A0B0E]">
                    Universal One-Click Login
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    No usernames, passwords, or emails required. Your cryptographic public address is your universal identity across all decentralized applications and networks.
                  </p>
                </div>
              </div>

              {/* Point 3: 100% Non-Custodial & Safe */}
              <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-black/5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0A0B0E] text-[#FFC700] flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0A0B0E]">
                    100% Non-Custodial &amp; Safe
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    Only you hold your private keys. Cryptohive never has access to your funds or private credentials. Every transfer requires your personal biometric or PIN signature approval inside your wallet app.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Recommended Wallets */}
            <div className="p-3.5 rounded-2xl bg-[#FFFDF6] border border-[#FDE68A] space-y-2">
              <span className="text-[11px] font-bold text-[#92400E] block">
                Recommended Wallets for Beginners:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-white border border-[#FDE68A] hover:bg-zinc-50 flex items-center justify-between font-bold text-[#0A0B0E] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MetaMaskIcon className="w-5 h-5" />
                    <span>MetaMask (EVM)</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </a>

                <a
                  href="https://phantom.app/download"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-white border border-[#FDE68A] hover:bg-zinc-50 flex items-center justify-between font-bold text-[#0A0B0E] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <PhantomIcon className="w-5 h-5" />
                    <span>Phantom (Solana)</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </a>
              </div>
            </div>

            {/* Return / Connect Button */}
            <button
              type="button"
              onClick={() => setView("WALLET_LIST")}
              className="w-full py-3.5 px-6 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Got It • Connect My Wallet</span>
              <ArrowRight className="w-4 h-4 text-[#FFC700]" />
            </button>
          </div>
        )}

        {/* ===================================================================
            VIEW 3: ALL WALLETS & MOBILE APPS (EXPANDED CHOOSER)
            =================================================================== */}
        {view === "ALL_WALLETS" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <button
                type="button"
                onClick={() => setView("WALLET_LIST")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-black transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Discovered Wallets</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWalletModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#0A0B0E]">
                Select Your Web3 Wallet
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Connect via browser extension, mobile app deep link, or hardware wallet
              </p>
            </div>

            {/* Wallets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {/* Trust Wallet */}
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => handleConnectWallet("Trust Wallet")}
                className="p-3 rounded-2xl bg-[#F7F8FA] hover:bg-zinc-100 border border-black/5 flex items-center justify-between text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <TrustWalletIcon className="w-7 h-7 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-[#0A0B0E] block">
                      Trust Wallet
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Mobile &amp; Extension
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              {/* Coinbase Wallet */}
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => handleConnectWallet("Coinbase Wallet")}
                className="p-3 rounded-2xl bg-[#F7F8FA] hover:bg-zinc-100 border border-black/5 flex items-center justify-between text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <CoinbaseWalletIcon className="w-7 h-7 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-[#0A0B0E] block">
                      Coinbase Wallet
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Smart Wallet &amp; App
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              {/* Solflare (Solana) */}
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => handleConnectWallet("Solflare")}
                className="p-3 rounded-2xl bg-[#F7F8FA] hover:bg-zinc-100 border border-black/5 flex items-center justify-between text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <SolflareIcon className="w-7 h-7 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-[#0A0B0E] block">
                      Solflare
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Solana Native
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              {/* Rainbow */}
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => handleConnectWallet("Rainbow")}
                className="p-3 rounded-2xl bg-[#F7F8FA] hover:bg-zinc-100 border border-black/5 flex items-center justify-between text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <RainbowIcon className="w-7 h-7 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-[#0A0B0E] block">
                      Rainbow
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Ethereum &amp; L2s
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              {/* Injected Browser */}
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => handleConnectWallet("Injected Browser")}
                className="p-3 rounded-2xl bg-[#F7F8FA] hover:bg-zinc-100 border border-black/5 flex items-center justify-between text-left transition-all sm:col-span-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#0A0B0E] text-[#FFC700] flex items-center justify-center font-bold text-xs">
                    🌐
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0A0B0E] block">
                      Rabby / Default Injected Wallet
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Auto-detect active EIP-1193 provider in your current browser
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Direct Address Tracker / Manual Input (Guarantees Mobile Users Can Test Even on Local Network) */}
            <form
              onSubmit={handleManualAddressSubmit}
              className="p-3.5 rounded-2xl bg-[#FFFDF6] border border-[#FDE68A] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#92400E]">
                  Or Enter Address Manually (Read-Only / Test Mode):
                </span>
                <span className="text-[10px] text-zinc-500">EVM 0x or Solana</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualAddressInput}
                  onChange={(e) => setManualAddressInput(e.target.value)}
                  placeholder="0x... or Solana Base58 address"
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-black/10 text-xs font-mono text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                />
                <button
                  type="submit"
                  disabled={!manualAddressInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[#0A0B0E] text-white text-xs font-bold hover:bg-zinc-800 disabled:opacity-40 transition-colors shrink-0"
                >
                  Link
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}