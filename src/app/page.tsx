"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { WalletConnectModal } from "@/components/WalletConnectModal";
import { ToastContainer } from "@/components/ToastContainer";
import { StatusBadge } from "@/components/StatusBadge";
import { useApexStore, OtcOrderItem } from "@/store/useApexStore";
import {
  SUPPORTED_NETWORKS,
  formatAddress,
  formatCurrency,
  isValidEvmAddress,
  isValidCryptoAddress,
  isValidSolanaAddress,
  parseWeb3Error,
  getTreasuryWalletForNetwork,
} from "@/lib/web3";
import { downloadReceiptAsFile } from "@/lib/receiptDownload";
import { FiatCurrencyModal } from "@/components/FiatCurrencyModal";
import {
  FiatChannel,
  isBuyChannelPermitted,
  isSellChannelPermitted,
  GLOBAL_FIAT_METADATA,
} from "@/lib/fiatChannels";
import {
  ArrowUpDown,
  ArrowLeft,
  ArrowRight,
  Wallet,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Building2,
  Send,
  RefreshCw,
  Rocket,
  BadgeCheck,
  Info,
  CheckCircle2,
  Download,
  Clock,
  Timer,
} from "lucide-react";

export default function CryptohiveExchangePage() {
  const {
    walletAddress,
    isConnected,
    chainId,
    switchNetwork,
    usdtBalance,
    rateConfig,
    fiatChannels,
    selectedFiatCode,
    setSelectedFiatCode,
    isLoadingRates,
    userOrders,
    userStats,
    isLoadingOrders,
    isWalletModalOpen,
    setWalletModalOpen,
    executeUsdtSellTransfer,
    fetchRates,
    fetchUserOrders,
    addToast,
  } = useApexStore();

  const [activeTab, setActiveTab] = useState<"BUY" | "SELL">("BUY");
  const [isFiatPickerOpen, setIsFiatPickerOpen] = useState(false);
  const [activeView, setActiveView] = useState<"EXCHANGE" | "LEDGER">(
    "EXCHANGE"
  );

  // Multi-Step Mobile Wizard State ("AMOUNT" -> "DETAILS") + Slide Animation Direction
  const [flowStep, setFlowStep] = useState<"AMOUNT" | "DETAILS">("AMOUNT");
  const [slideDirection, setSlideDirection] = useState<"forward" | "back">(
    "forward"
  );

  // Touch Gesture Coordinates for Swipe Back / Swipe Forward in Mobile & WebView
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Auto-hide the first Hero Card whenever the user clicks Wallet Connect or anything outside the Welcome Banner
  const [isHeroHidden, setIsHeroHidden] = useState(false);
  const heroBannerRef = useRef<HTMLElement | null>(null);

  // Real live active queue counter from backend
  const [liveQueueCounter, setLiveQueueCounter] = useState<number>(0);

  useEffect(() => {
    const fetchActiveCount = () => {
      fetch("/api/admin/overview")
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.pendingOrdersCount === "number") {
            setLiveQueueCounter(data.pendingOrdersCount);
          }
        })
        .catch(() => {});
    };

    fetchActiveCount();
    const interval = setInterval(fetchActiveCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // If wallet is not connected, always remain on or navigate back to the Welcome Page;
  // when wallet first connects, transition to the Exchange Form. If user navigates back to Welcome,
  // they remain connected without logging out.
  const prevConnectedRef = useRef(isConnected && Boolean(walletAddress));
  useEffect(() => {
    const isNowConnected = isConnected && Boolean(walletAddress);
    if (!isNowConnected) {
      setIsHeroHidden(false);
      setActiveView("EXCHANGE");
      setFlowStep("AMOUNT");
      setSubmittedOrderReceipt(null);
    } else if (!prevConnectedRef.current && isNowConnected) {
      // Transition to exchange on first connect
      setIsHeroHidden(true);
    }
    prevConnectedRef.current = isNowConnected;
  }, [isConnected, walletAddress]);

  // Active Multi-Fiat Channel selected by user (or default from store/backend)
  const rawActiveChannel =
    fiatChannels?.find((c) => c.code === selectedFiatCode) ||
    fiatChannels?.[0];

  const isPrimaryCurrency =
    (rawActiveChannel?.code || "NGN") === (rateConfig?.fiatCurrency || "NGN");

  const resolvedBankName =
    rawActiveChannel?.bankName?.trim() ||
    (isPrimaryCurrency ? rateConfig?.bankName?.trim() : "") ||
    "";
  const resolvedBankAccountNumber =
    rawActiveChannel?.bankAccountNumber?.trim() ||
    (isPrimaryCurrency ? rateConfig?.bankAccountNumber?.trim() : "") ||
    "";
  const resolvedBankAccountName =
    rawActiveChannel?.bankAccountName?.trim() ||
    (isPrimaryCurrency ? rateConfig?.bankAccountName?.trim() : "") ||
    "";
  const resolvedBankRoutingNote =
    rawActiveChannel?.bankRoutingNote ||
    (isPrimaryCurrency ? rateConfig?.bankRoutingNote : "") ||
    "";

  const hasAdminBankDetails = Boolean(
    resolvedBankName && resolvedBankAccountNumber
  );

  const activeFiatChannel: FiatChannel = {
    code: rawActiveChannel?.code || rateConfig?.fiatCurrency || "NGN",
    name: rawActiveChannel?.name || "Nigerian Naira",
    symbol: rawActiveChannel?.symbol || rateConfig?.fiatSymbol || "₦",
    flag: rawActiveChannel?.flag || "🇳🇬",
    usdReferenceRate:
      rawActiveChannel?.usdReferenceRate ||
      (rateConfig?.buyRate ? rateConfig.buyRate / 1.018 : 1620),
    buyRate: rawActiveChannel?.buyRate || rateConfig?.buyRate || 1650,
    sellRate: rawActiveChannel?.sellRate || rateConfig?.sellRate || 1605,
    buySpreadPercent: rawActiveChannel?.buySpreadPercent || 1.85,
    sellSpreadPercent: rawActiveChannel?.sellSpreadPercent || 0.93,
    buyEnabled:
      rawActiveChannel?.buyEnabled !== undefined
        ? rawActiveChannel.buyEnabled
        : hasAdminBankDetails,
    sellEnabled:
      rawActiveChannel?.sellEnabled !== undefined
        ? rawActiveChannel.sellEnabled
        : true,
    minTradeUsd: rawActiveChannel?.minTradeUsd || rateConfig?.minTradeUsd || 1.0,
    maxTradeUsd: rawActiveChannel?.maxTradeUsd || 50000,
    bankName: resolvedBankName,
    bankAccountNumber: resolvedBankAccountNumber,
    bankAccountName: resolvedBankAccountName,
    bankRoutingNote: resolvedBankRoutingNote,
  };

  const buyRate = activeFiatChannel.buyRate || rateConfig?.buyRate || 1650;
  const sellRate = activeFiatChannel.sellRate || rateConfig?.sellRate || 1605;
  const fiatSymbol = activeFiatChannel.symbol || rateConfig?.fiatSymbol || "₦";
  const fiatCurrency = activeFiatChannel.code || rateConfig?.fiatCurrency || "NGN";
  const minTradeUsd = activeFiatChannel.minTradeUsd || rateConfig?.minTradeUsd || 1.0;

  const buyPermission = isBuyChannelPermitted(activeFiatChannel);
  const sellPermission = isSellChannelPermitted(activeFiatChannel);

  // Buy Form State (Fiat -> USDT)
  const [buyFiatInput, setBuyFiatInput] = useState<string>("50000");
  const [buyUsdtInput, setBuyUsdtInput] = useState<string>("");
  const [buyInputMode, setBuyInputMode] = useState<"FIAT" | "USDT">("FIAT");

  // Re-align input amounts when currency changes
  const prevFiatCodeRef = useRef(selectedFiatCode);
  useEffect(() => {
    if (prevFiatCodeRef.current !== selectedFiatCode) {
      prevFiatCodeRef.current = selectedFiatCode;
      const targetUsd = 100;
      const newFiat = Math.round(targetUsd * buyRate);
      setBuyFiatInput(String(newFiat));
      setBuyUsdtInput("100.00");
    }
  }, [selectedFiatCode, buyRate]);
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [senderAccountName, setSenderAccountName] = useState<string>("");
  const [isSubmittingBuy, setIsSubmittingBuy] = useState(false);

  // 15-Minute Guaranteed Price Lock States for Buy Form (Step 2)
  const [lockedBuyOrder, setLockedBuyOrder] = useState<OtcOrderItem | null>(null);
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState<number>(900); // 15 mins (900s)
  const [lockStartedTime, setLockStartedTime] = useState<string | null>(null);
  const [isLockRefreshing, setIsLockRefreshing] = useState(false);

  // 15-Minute Guaranteed Price Lock States for Sell Form (Step 2)
  const [lockedSellOrder, setLockedSellOrder] = useState<OtcOrderItem | null>(null);
  const [sellLockSecondsRemaining, setSellLockSecondsRemaining] = useState<number>(900); // 15 mins (900s)
  const [sellLockStartedTime, setSellLockStartedTime] = useState<string | null>(null);
  const [isSellLockRefreshing, setIsSellLockRefreshing] = useState(false);
  const [sellPaymentReference, setSellPaymentReference] = useState<string>("");

  // Reserve a guaranteed DB-unique Buy Payment & Receipt Reference Code
  const reserveUniqueBuyReference = async () => {
    try {
      const res = await fetch("/api/orders?reserveCode=BUY", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.success && data?.referenceCode) {
        setPaymentReference(data.referenceCode);
        return data.referenceCode as string;
      }
    } catch {
      // Fallback if offline
    }
    const fallback = `CHV-B${Math.floor(100000 + Math.random() * 900000)}`;
    setPaymentReference(fallback);
    return fallback;
  };

  // Reserve a guaranteed DB-unique Sell Payment & Receipt Reference Code
  const reserveUniqueSellReference = async () => {
    try {
      const res = await fetch("/api/orders?reserveCode=SELL", {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.success && data?.referenceCode) {
        setSellPaymentReference(data.referenceCode);
        return data.referenceCode as string;
      }
    } catch {
      // Fallback if offline
    }
    const fallback = `CHV-S${Math.floor(100000 + Math.random() * 900000)}`;
    setSellPaymentReference(fallback);
    return fallback;
  };

  useEffect(() => {
    reserveUniqueBuyReference();
    reserveUniqueSellReference();
  }, []);

  // Sell Form State (USDT -> Fiat)
  const [sellUsdtInput, setSellUsdtInput] = useState<string>("250");
  const [userBankName, setUserBankName] = useState<string>("");
  const [userAccountNumber, setUserAccountNumber] = useState<string>("");
  const [userAccountName, setUserAccountName] = useState<string>("");
  const [isSigningSell, setIsSigningSell] = useState(false);

  // Active Order Receipt Screen
  const [submittedOrderReceipt, setSubmittedOrderReceipt] =
    useState<OtcOrderItem | null>(null);
  const [paymentButtonStep, setPaymentButtonStep] = useState<
    "idle" | "processing" | "done" | "hidden"
  >("idle");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [mobileMenuState, setMobileMenuState] = useState<
    "open" | "closing" | "closed"
  >("closed");

  const activeNetwork =
    SUPPORTED_NETWORKS[chainId] || SUPPORTED_NETWORKS[1];

  const isSolanaConnected = Boolean(walletAddress && isValidSolanaAddress(walletAddress));
  const isEvmConnected = Boolean(walletAddress && walletAddress.startsWith("0x"));

  // Real-time synchronization of the active Receipt Screen with Admin Vault updates
  useEffect(() => {
    if (!submittedOrderReceipt) return;

    let isSubscribed = true;
    const pollInterval = setInterval(async () => {
      try {
        const orderId = submittedOrderReceipt.id;
        const res = await fetch(
          `/api/orders?walletAddress=${encodeURIComponent(walletAddress || "")}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (isSubscribed && data.success && Array.isArray(data.orders)) {
          const matching = data.orders.find(
            (o: OtcOrderItem) =>
              o.id === orderId ||
              o.referenceCode === submittedOrderReceipt.referenceCode
          );
          if (matching && matching.status !== submittedOrderReceipt.status) {
            setSubmittedOrderReceipt(matching);
            if (matching.status === "completed") {
              addToast({
                title: "Payment Confirmed & Settled! 🎉",
                description: `Order ${matching.referenceCode} has been confirmed and settled by the admin desk.`,
                variant: "success",
              });
            }
          }
        }
      } catch {
        // Ignore transient background poll errors
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [submittedOrderReceipt, walletAddress, addToast]);

  useEffect(() => {
    if (buyInputMode === "FIAT") {
      const fiatVal = parseFloat(buyFiatInput) || 0;
      const calculatedUsdt = buyRate > 0 ? fiatVal / buyRate : 0;
      setBuyUsdtInput(calculatedUsdt > 0 ? calculatedUsdt.toFixed(2) : "");
    } else {
      const usdtVal = parseFloat(buyUsdtInput) || 0;
      const calculatedFiat = usdtVal * buyRate;
      setBuyFiatInput(calculatedFiat > 0 ? calculatedFiat.toFixed(2) : "");
    }
  }, [buyRate, buyFiatInput, buyUsdtInput, buyInputMode]);

  const hideHeroOnInteract = () => {
    if (!isConnected || !walletAddress) {
      setIsHeroHidden(false);
      setActiveView("EXCHANGE");
      return;
    }
    if (!isHeroHidden) {
      setIsHeroHidden(true);
    }
  };

  // Strict numeric input sanitizer (digits and single decimal point only, no letters or alphanumeric chars)
  const sanitizeDecimalInput = (raw: string): string => {
    const clean = raw.replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("");
    }
    return clean;
  };

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(e.key) ||
      (e.ctrlKey || e.metaKey)
    ) {
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      return;
    }
    if (e.key === "." && !e.currentTarget.value.includes(".")) {
      return;
    }
    e.preventDefault();
  };

  // Strict $5 Minimum Limit Calculations
  const minBuyFiatRequired = minTradeUsd * buyRate;
  const currentBuyFiat = parseFloat(buyFiatInput) || 0;
  const currentBuyUsdt = parseFloat(buyUsdtInput) || 0;
  const isBuyBelowMinimum =
    currentBuyUsdt < minTradeUsd - 0.001 ||
    currentBuyFiat < minBuyFiatRequired - 0.5;

  const currentSellUsdt = parseFloat(sellUsdtInput) || 0;
  const calculatedSellFiat = currentSellUsdt * sellRate;
  const isSellBelowMinimum = currentSellUsdt < minTradeUsd - 0.001;

  // 15-Minute Guaranteed Price Lock Helpers
  const formatLockTimer = (seconds: number) => {
    const mins = Math.max(0, Math.floor(seconds / 60));
    const secs = Math.max(0, seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const lockBuyOrderTrade = async (overrideRef?: string) => {
    try {
      const activeRef =
        overrideRef || paymentReference || (await reserveUniqueBuyReference());
      const targetWallet = walletAddress;
      if (!targetWallet) return;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOCK_BUY_TRADE",
          orderType: "BUY",
          walletAddress: targetWallet,
          receivingWallet: targetWallet,
          fiatAmount: currentBuyFiat,
          usdtAmount: currentBuyUsdt,
          referenceCode: activeRef,
          paymentReference: activeRef,
          senderAccountName:
            senderAccountName.trim() || "Verified Account Holder",
          networkChainId: isSolanaConnected ? 101 : chainId,
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setLockedBuyOrder(data.order);
        setLockStartedTime(
          data.lockStartedDisplay || new Date().toLocaleTimeString()
        );
        setLockSecondsRemaining(900);
      }
    } catch (err) {
      console.error("Failed to lock buy trade on step 2:", err);
    }
  };

  const handleAutoRefreshExpiredLock = async () => {
    if (isLockRefreshing) return;
    setIsLockRefreshing(true);
    try {
      await fetchRates();

      const activeRef = paymentReference || lockedBuyOrder?.referenceCode;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REFRESH_EXPIRED_LOCK",
          referenceCode: activeRef,
          orderId: lockedBuyOrder?.id,
          usdtAmount: currentBuyUsdt,
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setLockedBuyOrder(data.order);
        setLockStartedTime(
          data.lockStartedDisplay || new Date().toLocaleTimeString()
        );
        setLockSecondsRemaining(900);

        const newFiatVal = Number(data.order.fiatAmount).toFixed(2);
        setBuyFiatInput(newFiatVal);

        addToast({
          title: "15-Min Lock Expired & Refreshed",
          description: `Rate updated to live ${formatCurrency(
            data.order.exchangeRateApplied,
            fiatSymbol,
            2
          )}/USDT. New total: ${formatCurrency(
            data.order.fiatAmount,
            fiatSymbol
          )}. Resent to Admin Dashboard, Email & Telegram.`,
          variant: "info",
        });
      }
    } catch (err) {
      console.error("Error refreshing expired price lock:", err);
    } finally {
      setIsLockRefreshing(false);
    }
  };

  // 15-Minute Countdown Timer while user is on Step 2 of BUY flow
  useEffect(() => {
    if (
      flowStep !== "DETAILS" ||
      activeTab !== "BUY" ||
      submittedOrderReceipt
    ) {
      return;
    }

    const timer = setInterval(() => {
      setLockSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleAutoRefreshExpiredLock();
          return 900;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    flowStep,
    activeTab,
    submittedOrderReceipt,
    paymentReference,
    lockedBuyOrder,
    currentBuyUsdt,
    isLockRefreshing,
  ]);

  const lockSellOrderTrade = async (overrideRef?: string) => {
    try {
      const activeRef =
        overrideRef || sellPaymentReference || (await reserveUniqueSellReference());
      const targetWallet = walletAddress;
      if (!targetWallet) return;

      const treasuryAddress = getTreasuryWalletForNetwork(
        isSolanaConnected ? 101 : chainId,
        rateConfig?.treasuryWallet
      );

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOCK_SELL_TRADE",
          orderType: "SELL",
          walletAddress: targetWallet,
          receivingWallet: treasuryAddress,
          fiatAmount: calculatedSellFiat,
          usdtAmount: currentSellUsdt,
          referenceCode: activeRef,
          networkChainId: isSolanaConnected ? 101 : chainId,
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setLockedSellOrder(data.order);
        setSellLockStartedTime(
          data.lockStartedDisplay || new Date().toLocaleTimeString()
        );
        setSellLockSecondsRemaining(900);
      }
    } catch (err) {
      console.error("Failed to lock sell trade on step 2:", err);
    }
  };

  const handleAutoRefreshExpiredSellLock = async () => {
    if (isSellLockRefreshing) return;
    setIsSellLockRefreshing(true);
    try {
      await fetchRates();

      const activeRef = sellPaymentReference || lockedSellOrder?.referenceCode;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REFRESH_EXPIRED_LOCK",
          referenceCode: activeRef,
          orderId: lockedSellOrder?.id,
          usdtAmount: currentSellUsdt,
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setLockedSellOrder(data.order);
        setSellLockStartedTime(
          data.lockStartedDisplay || new Date().toLocaleTimeString()
        );
        setSellLockSecondsRemaining(900);

        addToast({
          title: "15-Min Lock Expired & Refreshed",
          description: `Sell rate updated to live ${formatCurrency(
            data.order.exchangeRateApplied,
            fiatSymbol,
            2
          )}/USDT. New payout: ${formatCurrency(
            data.order.fiatAmount,
            fiatSymbol
          )}. Resent to Admin Dashboard, Email & Telegram.`,
          variant: "info",
        });
      }
    } catch (err) {
      console.error("Error refreshing expired sell price lock:", err);
    } finally {
      setIsSellLockRefreshing(false);
    }
  };

  // 15-Minute Countdown Timer while user is on Step 2 of SELL flow
  useEffect(() => {
    if (
      flowStep !== "DETAILS" ||
      activeTab !== "SELL" ||
      submittedOrderReceipt
    ) {
      return;
    }

    const timer = setInterval(() => {
      setSellLockSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleAutoRefreshExpiredSellLock();
          return 900;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    flowStep,
    activeTab,
    submittedOrderReceipt,
    sellPaymentReference,
    lockedSellOrder,
    currentSellUsdt,
    isSellLockRefreshing,
  ]);

  // Step Navigation Helpers (Supports Button Click, Touch Swipe, & Android/iOS WebView Back History)
  const goToDetailsStep = () => {
    hideHeroOnInteract();

    if (activeTab === "BUY" && !buyPermission.permitted) {
      addToast({
        title: `${activeFiatChannel.code} Currently Unavailable`,
        description:
          buyPermission.reason ||
          "Payment to this country is currently unavailable. Bank rails have not been assigned by the administrator.",
        variant: "error",
      });
      return;
    }

    if (activeTab === "SELL" && !sellPermission.permitted) {
      addToast({
        title: `${activeFiatChannel.code} Payout Disabled`,
        description:
          sellPermission.reason ||
          "Selling USDT to receive this currency is currently disabled by treasury admin.",
        variant: "error",
      });
      return;
    }

    if (activeTab === "BUY" && isBuyBelowMinimum) {
      addToast({
        title: `Below Minimum Trade Limit ($${minTradeUsd.toFixed(2)})`,
        description: `Minimum order is $${minTradeUsd.toFixed(2)} USD equivalent (${formatCurrency(minBuyFiatRequired, fiatSymbol)} / ${minTradeUsd.toFixed(2)} USDT).`,
        variant: "error",
      });
      return;
    }

    if (activeTab === "SELL" && isSellBelowMinimum) {
      addToast({
        title: `Below Minimum Trade Limit ($${minTradeUsd.toFixed(2)})`,
        description: `Minimum sell amount is ${minTradeUsd.toFixed(2)} USDT ($${minTradeUsd.toFixed(2)} USD equivalent).`,
        variant: "error",
      });
      return;
    }

    if (activeTab === "BUY") {
      if (!isConnected || !walletAddress) {
        setWalletModalOpen(true);
        addToast({
          title: "Connect Wallet to Lock Rate",
          description: "Please connect your Web3 wallet (MetaMask, Phantom, etc.) to lock in your live price and bank details.",
          variant: "info",
        });
        return;
      }

      lockBuyOrderTrade();
    }

    if (activeTab === "SELL") {
      if (!isConnected || !walletAddress) {
        setWalletModalOpen(true);
        addToast({
          title: "Connect Wallet to Lock Rate",
          description: "Please connect your Web3 wallet (MetaMask, Phantom, etc.) to lock in your live sell rate.",
          variant: "info",
        });
        return;
      }

      const availableBalance = typeof usdtBalance === "number" ? usdtBalance : 0;
      if (currentSellUsdt > availableBalance) {
        addToast({
          title: "Insufficient USDT Balance",
          description: `Your available balance is ${availableBalance.toFixed(2)} USDT, but you entered ${currentSellUsdt.toFixed(2)} USDT.`,
          variant: "error",
        });
        return;
      }

      lockSellOrderTrade();
    }

    setSlideDirection("forward");
    setFlowStep("DETAILS");
    if (typeof window !== "undefined") {
      window.history.pushState({ cryptohiveStep: "DETAILS" }, "");
    }
  };

  const goBackToAmountStep = () => {
    hideHeroOnInteract();
    setSlideDirection("back");
    if (activeView === "LEDGER") {
      setActiveView("EXCHANGE");
      return;
    }
    if (submittedOrderReceipt) {
      setSubmittedOrderReceipt(null);
      setFlowStep("AMOUNT");
      return;
    }
    setFlowStep("AMOUNT");
  };

  // Support Android Hardware Back Button & iOS WebView Back History
  useEffect(() => {
    const handlePopState = () => {
      if (activeView === "LEDGER") {
        setSlideDirection("back");
        setActiveView("EXCHANGE");
      } else if (submittedOrderReceipt) {
        setSlideDirection("back");
        setSubmittedOrderReceipt(null);
        setFlowStep("AMOUNT");
      } else if (flowStep === "DETAILS") {
        setSlideDirection("back");
        setFlowStep("AMOUNT");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeView, flowStep, submittedOrderReceipt]);

  // Touch Swipe-Back (Right) and Swipe-Forward (Left) Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Require clear horizontal gesture (dominant over vertical scrolling)
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3) {
      return;
    }

    if (deltaX > 55) {
      // Swipe Right -> Back
      if (activeView === "LEDGER" || submittedOrderReceipt || flowStep === "DETAILS") {
        goBackToAmountStep();
      }
    } else if (deltaX < -55) {
      // Swipe Left -> Forward (Continue to Account Details)
      if (activeView === "EXCHANGE" && !submittedOrderReceipt && flowStep === "AMOUNT") {
        goToDetailsStep();
      }
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handlePaymentDoneClick = async () => {
    if (!submittedOrderReceipt || paymentButtonStep !== "idle") return;
    setPaymentButtonStep("processing");
    try {
      const response = await fetch(`/api/orders/${submittedOrderReceipt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "USER_PAYMENT_DONE",
          walletAddress: submittedOrderReceipt.walletAddress,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to process payment confirmation."
        );
      }

      setPaymentButtonStep("done");
      await fetchUserOrders();

      setTimeout(() => {
        setPaymentButtonStep("hidden");
      }, 900);
    } catch (error) {
      setPaymentButtonStep("idle");
      addToast({
        title: "Request Failed",
        description:
          error instanceof Error ? error.message : "Could not confirm payment.",
        variant: "error",
      });
    }
  };

  // Submit Buy Order Handler (Step 2: Fiat -> USDT)
  const handleBuyOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    hideHeroOnInteract();

    if (!isConnected || !walletAddress) {
      setWalletModalOpen(true);
      return;
    }

    if (isBuyBelowMinimum) {
      addToast({
        title: `Below Minimum Trade Limit ($${minTradeUsd.toFixed(2)})`,
        description: `Minimum order is $${minTradeUsd.toFixed(2)} USD equivalent (${formatCurrency(minBuyFiatRequired, fiatSymbol)} / ${minTradeUsd.toFixed(2)} USDT).`,
        variant: "error",
      });
      return;
    }

    const targetWallet = walletAddress.trim();
    if (!isValidCryptoAddress(targetWallet, chainId)) {
      addToast({
        title: "Invalid Connected Wallet",
        description:
          chainId === 101
            ? "Please connect a valid Solana wallet address (Base58)."
            : "Please connect a valid Web3 wallet address.",
        variant: "error",
      });
      return;
    }

    setIsSubmittingBuy(true);
    try {
      const activePaymentRef =
        paymentReference.trim() || (await reserveUniqueBuyReference());

      let finalOrder: OtcOrderItem | null = lockedBuyOrder;

      if (lockedBuyOrder?.id) {
        // Confirm payment on the existing locked order
        const response = await fetch(`/api/orders/${lockedBuyOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "USER_PAYMENT_DONE",
            walletAddress,
          }),
        });
        const data = await response.json();
        if (data?.success && data?.order) {
          finalOrder = data.order;
        }
      } else {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderType: "BUY",
            walletAddress,
            receivingWallet: targetWallet,
            fiatAmount: currentBuyFiat,
            usdtAmount: currentBuyUsdt,
            inputMode: buyInputMode,
            referenceCode: activePaymentRef,
            paymentReference: activePaymentRef,
            senderAccountName:
              senderAccountName.trim() || "Verified Account Holder",
            networkChainId: isSolanaConnected ? 101 : chainId,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to create Buy order.");
        }
        finalOrder = data.order;

        // Trigger payment confirmation alert
        if (finalOrder?.id) {
          await fetch(`/api/orders/${finalOrder.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "USER_PAYMENT_DONE",
              walletAddress,
            }),
          });
        }
      }

      setSlideDirection("forward");
      setSubmittedOrderReceipt(finalOrder);
      setPaymentButtonStep("idle");
      reserveUniqueBuyReference();
      if (typeof window !== "undefined") {
        window.history.pushState({ cryptohiveStep: "RECEIPT" }, "");
      }
      await fetchUserOrders();

      addToast({
        title: "Payment Done Confirmed!",
        description: `Order ${finalOrder?.referenceCode || activePaymentRef} verified. Admin alerted via Email, Telegram & Vault.`,
        variant: "success",
      });
    } catch (error) {
      addToast({
        title: "Buy Order Failed",
        description:
          error instanceof Error ? error.message : "Could not submit order.",
        variant: "error",
      });
    } finally {
      setIsSubmittingBuy(false);
    }
  };

  // Submit Sell Order Handler (Step 2: USDT -> Fiat with On-Chain Wallet Transfer)
  const handleSellOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    hideHeroOnInteract();

    if (!isConnected || !walletAddress) {
      setWalletModalOpen(true);
      return;
    }

    if (isSellBelowMinimum) {
      addToast({
        title: `Below Minimum Trade Limit ($${minTradeUsd.toFixed(2)})`,
        description: `Minimum sell amount is ${minTradeUsd.toFixed(2)} USDT ($${minTradeUsd.toFixed(2)} USD equivalent).`,
        variant: "error",
      });
      return;
    }

    const availableBalance = typeof usdtBalance === "number" ? usdtBalance : 0;
    if (currentSellUsdt > availableBalance) {
      addToast({
        title: "Insufficient USDT Balance",
        description: `Your available balance is ${availableBalance.toFixed(2)} USDT, but you are attempting to sell ${currentSellUsdt.toFixed(2)} USDT.`,
        variant: "error",
      });
      return;
    }

    if (
      !userBankName.trim() ||
      !userAccountNumber.trim() ||
      !userAccountName.trim()
    ) {
      addToast({
        title: "Bank Details Required",
        description:
          "Please provide your Bank Name, Account Number, and Account Name for fiat settlement.",
        variant: "warning",
      });
      return;
    }

    const treasuryAddress = getTreasuryWalletForNetwork(
      isSolanaConnected ? 101 : chainId,
      rateConfig?.treasuryWallet
    );

    setIsSigningSell(true);
    try {
      addToast({
        title: "Awaiting Wallet Signature",
        description: `Please confirm the transfer of ${currentSellUsdt.toFixed(2)} USDT to Cryptohive Treasury in your Web3 wallet.`,
        variant: "info",
      });

      const { txHash } = await executeUsdtSellTransfer({
        usdtAmount: currentSellUsdt,
        treasuryAddress,
      });

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "SELL",
          walletAddress,
          receivingWallet: treasuryAddress,
          usdtAmount: currentSellUsdt,
          fiatAmount: lockedSellOrder?.fiatAmount || calculatedSellFiat,
          referenceCode: sellPaymentReference || lockedSellOrder?.referenceCode,
          orderId: lockedSellOrder?.id,
          userBankName: userBankName.trim(),
          userAccountNumber: userAccountNumber.trim(),
          userAccountName: userAccountName.trim(),
          cryptoDepositTxHash: txHash,
          networkChainId: isSolanaConnected ? 101 : chainId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to log Sell order.");
      }

      setSlideDirection("forward");
      setSubmittedOrderReceipt(data.order);
      setPaymentButtonStep("idle");
      reserveUniqueSellReference();
      if (typeof window !== "undefined") {
        window.history.pushState({ cryptohiveStep: "RECEIPT" }, "");
      }
      await fetchUserOrders();

      addToast({
        title: "USDT Sent & Order Logged!",
        description: `TxHash captured (${txHash.slice(0, 10)}...). Order ${data.order.referenceCode} is now pending fiat payout.`,
        variant: "success",
      });
    } catch (error) {
      addToast({
        title: "Web3 Transaction Aborted",
        description: parseWeb3Error(error),
        variant: "error",
      });
    } finally {
      setIsSigningSell(false);
    }
  };

  const stepAnimationClass =
    slideDirection === "forward" ? "animate-slideRight" : "animate-slideLeft";

  return (
    <div className="min-h-screen bg-[#EEF0F4] text-[#0A0B0E] flex flex-col select-none sm:select-auto">
      <Navbar
        activeView={activeView}
        activeTab={activeTab}
        isHeroHidden={isHeroHidden}
        onMobileMenuChange={setMobileMenuState}
        onNavInteract={(tab) => {
          if (!isConnected || !walletAddress) {
            setIsHeroHidden(false);
            setActiveView("EXCHANGE");
            setFlowStep("AMOUNT");
            setSubmittedOrderReceipt(null);
            setWalletModalOpen(true);
            return;
          }
          if (tab === "WELCOME") {
            // Navigate back to the Welcome Page without disconnecting or logging out
            setIsHeroHidden(false);
            setActiveView("EXCHANGE");
            setSubmittedOrderReceipt(null);
            setFlowStep("AMOUNT");
            return;
          }
          hideHeroOnInteract();
          if (tab === "LEDGER") {
            setSlideDirection("forward");
            setActiveView("LEDGER");
            fetchUserOrders();
            if (typeof window !== "undefined") {
              window.history.pushState({ cryptohiveStep: "LEDGER" }, "");
            }
            return;
          }
          setActiveView("EXCHANGE");
          if (tab === "BUY" || tab === "SELL") {
            setActiveTab(tab);
            setSubmittedOrderReceipt(null);
            setFlowStep("AMOUNT");
          }
        }}
      />
      <WalletConnectModal />
      <ToastContainer />

      <main
        className={`flex-1 min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col items-center justify-center transition-all ${
          mobileMenuState === "open"
            ? "animate-pageSuckIn"
            : mobileMenuState === "closing"
            ? "animate-pageRestoreOut"
            : ""
        }`}
      >
        {/* =====================================================================
            SECTION 1: CRYPTOHIVE SPLIT HERO BANNER (Shown Whenever Wallet Is Not Connected)
           ===================================================================== */}
        {(!isConnected || !walletAddress || !isHeroHidden) && (
          <section
            ref={heroBannerRef}
            className="w-full max-w-6xl mx-auto my-auto rounded-[26px] sm:rounded-[34px] bg-white hive-container-card overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all duration-300 animate-fadeIn"
          >
            {/* Left 7 Cols: Crisp White Editorial Hero */}
            <div className="lg:col-span-7 p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10 max-w-xl">
                <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-[#0A0B0E] leading-[1.15]">
                  Trade Freely. Stay Self-Custodial.
                </h1>

                <p className="mt-4 sm:mt-5 text-xs sm:text-base text-zinc-500 max-w-md leading-relaxed">
                  A decentralized exchange architecture designed for speed, privacy, and absolute asset control.
                </p>

                {/* Start DeFi Pill Button + Hand-Drawn Swooping Arrow SVG */}
                <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-4 sm:gap-6 relative">
                  {!isConnected ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setWalletModalOpen(true);
                        hideHeroOnInteract();
                      }}
                      className="group inline-flex items-center gap-3 sm:gap-4 pl-2 pr-6 sm:pr-8 py-2 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm shadow-xl transition-all active:scale-[0.98] shrink-0 z-10 cursor-pointer"
                    >
                      <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FFC700] flex items-center justify-center text-black group-hover:rotate-6 transition-transform">
                        <Wallet className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.3]" />
                      </span>
                      <span>Start DeFi</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => hideHeroOnInteract()}
                      className="group inline-flex items-center gap-3 sm:gap-4 pl-2 pr-6 sm:pr-8 py-2 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm shadow-xl transition-all shrink-0 z-10"
                    >
                      <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FFC700] flex items-center justify-center text-black">
                        <Wallet className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.3]" />
                      </span>
                      <span>Trade Now ({formatAddress(walletAddress)})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom-left designer hand-drawn flourish loop as in reference picture */}
              <div className="absolute -bottom-2 left-6 pointer-events-none opacity-50 hidden sm:block">
                <svg
                  className="w-16 h-12 text-[#0A0B0E]"
                  viewBox="0 0 64 48"
                  fill="none"
                >
                  <path
                    d="M 6 42 C 14 20, 24 10, 30 22 C 36 34, 25 44, 38 38 C 50 32, 56 12, 62 24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* User Dashboard Overview Metrics (Active Orders & Min Limit) */}
              <div className="mt-8 sm:mt-10 pt-5 sm:pt-6 border-t border-zinc-100 grid grid-cols-2 gap-4 sm:gap-6 relative z-10">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                    Active Orders
                  </span>
                  <span className="text-sm sm:text-xl font-black font-mono tabular-nums text-[#0A0B0E] mt-0.5 block">
                    {liveQueueCounter}{" "}
                    <span className="text-[10px] sm:text-xs font-normal text-zinc-400 font-sans hidden sm:inline">
                      in queue
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                    Min Limit
                  </span>
                  <span className="text-sm sm:text-xl font-black font-mono text-[#B45309] mt-0.5 block">
                    ${minTradeUsd.toFixed(2)}{" "}
                    <span className="text-[10px] sm:text-xs font-normal text-zinc-400 font-sans hidden sm:inline">
                      ({formatCurrency(minBuyFiatRequired, fiatSymbol, 0)})
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Vibrant Hive-Yellow Panel with Floating Black Feature Cards (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:col-span-5 bg-[#FFC700] p-6 sm:p-10 relative items-center justify-center min-h-[300px] sm:min-h-[380px] overflow-hidden">
              {/* Center 3D-Styled Smartphone Mockup (Gold & Obsidian — Zero Green) */}
              <div className="relative z-10 w-44 sm:w-52 rounded-[30px] sm:rounded-[34px] bg-[#0A0B0E] p-3 shadow-2xl border-4 border-zinc-800 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
                <div className="w-14 h-3 bg-black rounded-full mx-auto mb-2.5" />
                <div className="rounded-[22px] hive-obsidian-card p-3.5 sm:p-4 text-white space-y-3 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#FFC700]">
                      ● LIVE OTC
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      USDT/{fiatCurrency}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400">
                      Buy Rate (Fiat→USDT)
                    </div>
                    <div className="text-base sm:text-lg font-black font-mono text-white">
                      {formatCurrency(buyRate, fiatSymbol)}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[10px] text-zinc-400">
                      Sell Rate (USDT→Fiat)
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-[#FFC700]">
                      {formatCurrency(sellRate, fiatSymbol)}
                    </div>
                  </div>
                  <div className="w-full py-1.5 rounded-full bg-[#FFC700] text-black text-center text-[10px] font-extrabold">
                    Instant Payout
                  </div>
                </div>
              </div>

              {/* Floating Black Card 1: Security */}
              <div className="absolute left-3 sm:left-7 top-1/2 -translate-y-1/2 z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#0A0B0E] text-white p-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-2xl animate-float">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#FFC700]/15 flex items-center justify-center text-[#FFC700]">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold tracking-tight">
                  Security
                </span>
              </div>

              {/* Floating Black Card 2: Trustworthy */}
              <div className="absolute right-3 sm:right-7 top-6 sm:top-10 z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#0A0B0E] text-white p-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-2xl animate-float-delayed">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#FFC700]/15 flex items-center justify-center text-[#FFC700]">
                  <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold tracking-tight">
                  Trustworthy
                </span>
              </div>

              {/* Floating Black Card 3: Innovative */}
              <div className="absolute bottom-4 right-10 sm:right-20 z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#0A0B0E] text-white p-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 shadow-2xl animate-float">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#FFC700]/15 flex items-center justify-center text-[#FFC700]">
                  <Rocket className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold tracking-tight">
                  Innovative
                </span>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            SECTION 2: MOBILE-FIRST 2-STEP EXCHANGE WIZARD & LIVE RECEIPT
            Only Shown When Wallet Is Connected
           ===================================================================== */}
        {isConnected && Boolean(walletAddress) && isHeroHidden && activeView === "EXCHANGE" && (
        <section
          id="trade-section"
          onClick={hideHeroOnInteract}
          onFocusCapture={hideHeroOnInteract}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="max-w-xl mx-auto my-auto w-full py-2"
        >
          {submittedOrderReceipt ? (
            /* ===============================================================
               VIEW 3: LIVE ORDER RECEIPT SCREEN (Exchange Form Hidden Until Back/Close)
               =============================================================== */
            <div
              key="receipt-step"
              className={`rounded-[28px] sm:rounded-[34px] hive-obsidian-card border-2 border-[#FFC700]/50 p-5 sm:p-7 text-white space-y-5 ${stepAnimationClass}`}
            >
              {/* Top Navigation & Status Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={goBackToAmountStep}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#FFC700]" />
                  <span>Back to Exchange</span>
                </button>
                <StatusBadge status={submittedOrderReceipt.status} />
              </div>

              {/* Header: Title, Reference Code with Copy, and Exact Timestamp */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.svg"
                    alt="Cryptohive Logo"
                    className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-[0_2px_8px_rgba(255,199,0,0.25)] shrink-0"
                  />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFC700] block">
                      ● Live Receipt
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="text-xl sm:text-2xl font-black text-white font-mono">
                        {submittedOrderReceipt.referenceCode}
                      </h3>
                      <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          submittedOrderReceipt.referenceCode,
                          "receipt_ref"
                        )
                      }
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FFC700] transition-colors"
                      title="Copy Reference Code"
                    >
                      {copiedField === "receipt_ref" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="text-[11px] text-zinc-400 block mt-1 font-mono">
                    Time:{" "}
                    {new Date(submittedOrderReceipt.createdAt).toLocaleString(
                      "en-US",
                      {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      }
                    )}
                  </span>
                </div>
              </div>
            </div>

              {/* Financial Summary Highlight Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    {submittedOrderReceipt.orderType === "BUY"
                      ? "Total Paid (NGN)"
                      : "USDT Transferred"}
                  </span>
                  <div className="text-base sm:text-xl font-black font-mono text-[#FFC700] mt-0.5">
                    {submittedOrderReceipt.orderType === "BUY"
                      ? formatCurrency(
                          submittedOrderReceipt.fiatAmount,
                          fiatSymbol
                        )
                      : `${submittedOrderReceipt.usdtAmount.toFixed(2)} USDT`}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    {submittedOrderReceipt.orderType === "BUY"
                      ? "USDT To Receive"
                      : "Payout Amount"}
                  </span>
                  <div className="text-base sm:text-xl font-black font-mono text-white mt-0.5">
                    {submittedOrderReceipt.orderType === "BUY"
                      ? `${submittedOrderReceipt.usdtAmount.toFixed(2)} USDT`
                      : formatCurrency(
                          submittedOrderReceipt.fiatAmount,
                          fiatSymbol
                        )}
                  </div>
                </div>
              </div>

              {/* Complete Breakdown Table */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-zinc-400">Order Type</span>
                  <span className="font-bold text-white">
                    {submittedOrderReceipt.orderType === "BUY"
                      ? "Buy USDT (Fiat → Crypto)"
                      : "Sell USDT (Crypto → Fiat)"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-zinc-400">Applied Rate</span>
                  <span className="font-mono font-bold text-[#FFC700]">
                    1 USDT = {formatCurrency(submittedOrderReceipt.exchangeRateApplied, fiatSymbol)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-zinc-400">Payment Method</span>
                  <span className="font-bold text-white">Bank Transfer</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-zinc-400">Receiving Wallet</span>
                  <div className="flex items-center gap-1.5 font-mono text-zinc-200">
                    <span>
                      {formatAddress(
                        submittedOrderReceipt.receivingWallet ||
                          submittedOrderReceipt.walletAddress
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          submittedOrderReceipt.receivingWallet ||
                            submittedOrderReceipt.walletAddress,
                          "wallet_rcv"
                        )
                      }
                      className="text-zinc-400 hover:text-[#FFC700]"
                      title="Copy Wallet Address"
                    >
                      {copiedField === "wallet_rcv" ? (
                        <Check className="w-3 h-3 text-[#FFC700]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-zinc-400">Blockchain Network</span>
                  <span className="font-bold text-white">
                    {submittedOrderReceipt.networkName || activeNetwork.name}
                  </span>
                </div>

                {/* Buy: Corporate NGN Bank Details */}
                {submittedOrderReceipt.orderType === "BUY" && rateConfig && (
                  <>
                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFC700] block mb-2">
                        Bank Details
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-zinc-400">Bank Name</span>
                      <span className="font-bold text-white">
                        {activeFiatChannel.bankName ||
                          rateConfig?.bankName ||
                          "Pending Desk Assignment"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-zinc-400">Account No</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-[#FFC700]">
                        <span>
                          {activeFiatChannel.bankAccountNumber ||
                            rateConfig?.bankAccountNumber ||
                            "Pending"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              activeFiatChannel.bankAccountNumber ||
                                rateConfig?.bankAccountNumber ||
                                "",
                              "receipt_bank_acc"
                            )
                          }
                          className="text-zinc-400 hover:text-[#FFC700]"
                          title="Copy Account Number"
                        >
                          {copiedField === "receipt_bank_acc" ? (
                            <Check className="w-3 h-3 text-[#FFC700]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-zinc-400">Account Name</span>
                      <span className="font-bold text-white">
                        {activeFiatChannel.bankAccountName ||
                          rateConfig?.bankAccountName ||
                          "Treasury Settlement"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-zinc-400">Payment Reference</span>
                      <div className="flex items-center gap-1.5 font-mono text-[#FFC700]">
                        <span>
                          {submittedOrderReceipt.paymentReference ||
                            submittedOrderReceipt.referenceCode}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              submittedOrderReceipt.paymentReference ||
                                submittedOrderReceipt.referenceCode,
                              "receipt_pay_ref"
                            )
                          }
                          className="text-zinc-400 hover:text-[#FFC700]"
                          title="Copy Payment Reference"
                        >
                          {copiedField === "receipt_pay_ref" ? (
                            <Check className="w-3 h-3 text-[#FFC700]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                    {submittedOrderReceipt.treasuryPayoutTxHash && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-zinc-400">USDT Dispatch Tx</span>
                        <a
                          href={`${activeNetwork.explorerUrl}/tx/${submittedOrderReceipt.treasuryPayoutTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[#FFC700] hover:underline flex items-center gap-1"
                        >
                          <span>
                            {submittedOrderReceipt.treasuryPayoutTxHash.slice(
                              0,
                              10
                            )}
                            ...
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </>
                )}

                {/* Sell: Beneficiary Bank Details & TxHash */}
                {submittedOrderReceipt.orderType === "SELL" && (
                  <>
                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFC700] block mb-2">
                        Beneficiary Payout Bank
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-zinc-400">Payout Bank</span>
                      <span className="font-bold text-white">
                        {submittedOrderReceipt.userBankName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-zinc-400">Account Number</span>
                      <span className="font-mono font-bold text-[#FFC700]">
                        {submittedOrderReceipt.userAccountNumber}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-zinc-400">Account Name</span>
                      <span className="font-bold text-white">
                        {submittedOrderReceipt.userAccountName}
                      </span>
                    </div>
                    {submittedOrderReceipt.cryptoDepositTxHash && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-zinc-400">On-Chain TxHash</span>
                        <a
                          href={`${activeNetwork.explorerUrl}/tx/${submittedOrderReceipt.cryptoDepositTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[#FFC700] hover:underline flex items-center gap-1"
                        >
                          <span>
                            {submittedOrderReceipt.cryptoDepositTxHash.slice(
                              0,
                              10
                            )}
                            ...
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {submittedOrderReceipt.fiatPayoutReference && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-zinc-400">Fiat Settle Ref</span>
                        <span className="font-mono text-[#FFC700]">
                          {submittedOrderReceipt.fiatPayoutReference}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons: Download Receipt & Back */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await downloadReceiptAsFile(submittedOrderReceipt, rateConfig);
                    addToast({
                      title: "Receipt Downloaded",
                      description: `Saved receipt for order ${submittedOrderReceipt.referenceCode} (${submittedOrderReceipt.status.toUpperCase()}).`,
                      variant: "success",
                    });
                  }}
                  className="w-full py-4 rounded-full bg-[#FFC700] hover:bg-[#ffcf26] text-[#0A0B0E] font-black text-sm transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-[#FFC700]/20 active:scale-[0.99]"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={goBackToAmountStep}
                  className="w-full py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-zinc-200 font-extrabold text-xs sm:text-sm transition-all active:scale-[0.99]"
                >
                  New Trade / Close Receipt
                </button>
              </div>

              {/* Live Synced Indicator */}
              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] font-bold text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-[#FFC700] animate-pulse" />
                <span>Live status synced with Cryptohive Treasury Desk</span>
              </div>
            </div>
          ) : flowStep === "AMOUNT" ? (
            /* ===============================================================
               STEP 1: EXCHANGE AMOUNT FORM (Account Details Hidden Until Continue)
               =============================================================== */
            <div
              key="amount-step"
              className={`bg-white rounded-[26px] sm:rounded-[34px] p-5 sm:p-8 hive-container-card ${stepAnimationClass}`}
            >
              {/* Top Header: Buy / Sell Hardware Pill Buttons + Gold '• Live quote' Pill */}
              <div className="flex items-center justify-between pb-5 sm:pb-6 border-b border-zinc-100 gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("BUY");
                      setSubmittedOrderReceipt(null);
                      hideHeroOnInteract();
                    }}
                    className={`px-5 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all ${
                      activeTab === "BUY"
                        ? "bg-[#0A0B0E] text-[#FFC700]"
                        : "bg-[#FFC700] text-[#0A0B0E] hover:bg-[#ffcf26]"
                    }`}
                  >
                    Buy
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("SELL");
                      setSubmittedOrderReceipt(null);
                      hideHeroOnInteract();
                    }}
                    className={`px-5 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all ${
                      activeTab === "SELL"
                        ? "bg-[#0A0B0E] text-[#FFC700]"
                        : "bg-[#FFC700] text-[#0A0B0E] hover:bg-[#ffcf26]"
                    }`}
                  >
                    Sell
                  </button>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF8DB] text-[#B45309] border border-[#FDE68A] text-xs font-bold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
                  Live quote
                </span>
              </div>

              {activeTab === "BUY" ? (
                /* -------- STEP 1 BUY: EXCHANGE AMOUNT INPUTS -------- */
                <div className="mt-5 sm:mt-6 space-y-5">
                  {/* Top Box: Spend Fiat */}
                  <div className="rounded-2xl bg-[#F7F8FA] p-4 sm:p-5 hive-field-card focus-within:border-[#0A0B0E]/40 transition-colors">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-2 gap-2 flex-wrap">
                      <span className="font-bold text-[#0A0B0E]">
                        Spend {fiatCurrency}
                      </span>
                      <span>
                        Min:{" "}
                        <strong className="font-mono text-[#0A0B0E]">
                          {formatCurrency(minBuyFiatRequired, fiatSymbol)}
                        </strong>{" "}
                        (${minTradeUsd.toFixed(2)})
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                        <span className="text-xl sm:text-3xl font-black text-[#0A0B0E] font-mono">
                          {fiatSymbol}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={buyFiatInput}
                          onKeyDown={handleNumericKeyDown}
                          onChange={(e) => {
                            setBuyInputMode("FIAT");
                            setBuyFiatInput(sanitizeDecimalInput(e.target.value));
                            hideHeroOnInteract();
                          }}
                          placeholder="50000"
                          className="w-full bg-transparent text-2xl sm:text-4xl font-black font-mono text-[#0A0B0E] focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsFiatPickerOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-black/10 hover:border-[#FFC700] hover:bg-[#FFF8DB] transition-all text-xs sm:text-sm font-extrabold text-[#0A0B0E] shrink-0 shadow-sm"
                        title="Click to select another currency"
                      >
                        <span className="text-base leading-none">{activeFiatChannel.flag || "🌐"}</span>
                        <span>{fiatCurrency}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>

                    {/* Preset Amount Pills */}
                    <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {[
                          { label: "$100", usdt: 100 },
                          { label: "$250", usdt: 250 },
                          { label: "$500", usdt: 500 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setBuyInputMode("USDT");
                              setBuyUsdtInput(String(preset.usdt));
                              hideHeroOnInteract();
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                              Math.round(currentBuyUsdt) === preset.usdt
                                ? "bg-[#0A0B0E] text-[#FFC700]"
                                : "bg-white text-zinc-500 hover:bg-zinc-100 border border-black/5"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setBuyInputMode("USDT");
                          setBuyUsdtInput("1000");
                          hideHeroOnInteract();
                        }}
                        className="px-3 py-1 rounded-full bg-zinc-200/80 hover:bg-zinc-300/80 text-xs font-bold text-[#0A0B0E] flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0A0B0E]" />
                        $1,000
                      </button>
                    </div>
                  </div>

                  {/* Dashed Swap Divider */}
                  <div className="relative flex items-center justify-center my-1">
                    <div className="w-full border-t border-dashed border-zinc-200" />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("SELL");
                        hideHeroOnInteract();
                      }}
                      className="absolute w-9 h-9 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center text-zinc-500 hover:text-[#0A0B0E] hover:scale-105 transition-all"
                      title="Switch to Sell USDT"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Second Box: Buy USDT Output */}
                  <div className="rounded-2xl bg-[#FFFDF6] p-4 sm:p-5 hive-field-card !border-[#FDE68A]">
                    <div className="flex items-center justify-between text-xs mb-2 gap-2 flex-wrap">
                      <span className="font-bold text-[#0A0B0E]">Buy USDT</span>
                      <span className="font-mono text-zinc-500">
                        {isLoadingRates
                          ? "Syncing rate..."
                          : `1 USDT = ${formatCurrency(buyRate, fiatSymbol)}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={buyUsdtInput}
                          onKeyDown={handleNumericKeyDown}
                          onChange={(e) => {
                            setBuyInputMode("USDT");
                            setBuyUsdtInput(sanitizeDecimalInput(e.target.value));
                            hideHeroOnInteract();
                          }}
                          placeholder="30.30"
                          className="w-full bg-transparent text-2xl sm:text-4xl font-black font-mono text-[#0A0B0E] focus:outline-none"
                        />
                      </div>

                      <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-full bg-white border border-black/10 shadow-sm shrink-0">
                        <span className="w-5 h-5 rounded-full bg-[#0A0B0E] text-[#FFC700] text-[10px] font-black flex items-center justify-center">
                          ₮
                        </span>
                        <span className="text-xs font-extrabold text-[#0A0B0E]">
                          USDT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Strict $5 Minimum Trade Limit Warning */}
                  {isBuyBelowMinimum && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Minimum Trade Limit:</span>{" "}
                        Orders must be at least{" "}
                        <strong className="font-mono">
                          ${minTradeUsd.toFixed(2)} USD
                        </strong>{" "}
                        equivalent (
                        <strong className="font-mono">
                          {formatCurrency(minBuyFiatRequired, fiatSymbol)}
                        </strong>{" "}
                        or{" "}
                        <strong className="font-mono">
                          {minTradeUsd.toFixed(2)} USDT
                        </strong>
                        ).
                      </div>
                    </div>
                  )}

                  {/* First-Page Buy Permission & Bank Details Availability Notification */}
                  {!buyPermission.permitted && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2.5 text-xs text-amber-950">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-extrabold text-sm text-[#0A0B0E] block">
                            Payment for {activeFiatChannel.name} ({activeFiatChannel.code}) is Currently Unavailable
                          </span>
                          <p className="text-zinc-600 leading-relaxed text-[11px]">
                            {buyPermission.reason ||
                              "Corporate deposit rails for this currency are currently inactive. Account details have not been assigned by the treasury administrator."}
                          </p>
                        </div>
                      </div>
                      <div className="pt-1 flex items-center justify-between border-t border-amber-500/20">
                        <span className="text-[10px] font-bold text-amber-800">
                          Try choosing another listed fiat currency
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsFiatPickerOpen(true)}
                          className="px-3.5 py-1.5 rounded-full bg-[#0A0B0E] text-[#FFC700] font-bold text-xs hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <span>Change Currency</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Summary Breakdown Box */}
                  <div className="rounded-2xl bg-[#F7F8FA] p-4 space-y-2.5 text-xs hive-field-card">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">You receive</span>
                      <span className="font-mono font-extrabold text-[#0A0B0E]">
                        ≈ {currentBuyUsdt.toFixed(2)} USDT (
                        {formatCurrency(currentBuyFiat, fiatSymbol)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Settlement Network</span>
                      {isConnected ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0A0B0E]/5 text-[#0A0B0E] border border-black/10 text-xs font-bold font-mono">
                          <span>
                            {chainId === 101
                              ? "Solana (SPL USDT)"
                              : chainId === 1
                              ? "Ethereum (ERC-20)"
                              : chainId === 56
                              ? "BNB Chain (BEP-20)"
                              : chainId === 137
                              ? "Polygon (POL USDT)"
                              : chainId === 42161
                              ? "Arbitrum (ARB USDT)"
                              : activeNetwork.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0A0B0E] text-[#FFC700] font-sans font-extrabold tracking-wider">
                            Locked
                          </span>
                        </div>
                      ) : (
                        <select
                          value={chainId}
                          onChange={(e) => switchNetwork(Number(e.target.value))}
                          className="bg-white border border-zinc-200 text-xs font-bold text-[#0A0B0E] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#0A0B0E] cursor-pointer"
                        >
                          <option value={1}>Ethereum (ERC-20)</option>
                          <option value={56}>BNB Chain (BEP-20)</option>
                          <option value={137}>Polygon (POL USDT)</option>
                          <option value={42161}>Arbitrum (ARB USDT)</option>
                          <option value={101}>Solana (SPL USDT)</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Step 1 Continue Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isBuyBelowMinimum || !buyPermission.permitted}
                      onClick={goToDetailsStep}
                      className="w-full py-4 px-6 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      <span>
                        {!buyPermission.permitted
                          ? `Payment Unavailable for ${fiatCurrency}`
                          : "Continue"}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#FFC700]" />
                    </button>
                  </div>
                </div>
              ) : (
                /* -------- STEP 1 SELL: EXCHANGE AMOUNT INPUTS -------- */
                <div className="mt-5 sm:mt-6 space-y-5">
                  {/* Top Box: Spend USDT */}
                  <div className="rounded-2xl bg-[#F7F8FA] p-4 sm:p-5 hive-field-card">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-2 gap-2 flex-wrap">
                      <span className="font-bold text-[#0A0B0E]">
                        Spend USDT
                      </span>
                      <span>
                        Bal:{" "}
                        <strong className="font-mono text-[#0A0B0E]">
                          {usdtBalance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          USDT
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                        <span className="text-xl sm:text-3xl font-black text-[#0A0B0E] font-mono">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={sellUsdtInput}
                          onKeyDown={handleNumericKeyDown}
                          onChange={(e) => {
                            setSellUsdtInput(sanitizeDecimalInput(e.target.value));
                            hideHeroOnInteract();
                          }}
                          placeholder="250"
                          className="w-full bg-transparent text-2xl sm:text-4xl font-black font-mono text-[#0A0B0E] focus:outline-none"
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-zinc-500 shrink-0">
                        USDT
                      </span>
                    </div>

                    {/* Preset Pills + Max Button */}
                    <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {[100, 250, 500].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setSellUsdtInput(String(preset));
                              hideHeroOnInteract();
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                              Number(sellUsdtInput) === preset
                                ? "bg-[#0A0B0E] text-[#FFC700]"
                                : "bg-white text-zinc-500 hover:bg-zinc-100 border border-black/5"
                            }`}
                          >
                            ${preset}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSellUsdtInput(
                            usdtBalance > 0 ? String(usdtBalance) : "500"
                          );
                          hideHeroOnInteract();
                        }}
                        className="px-3 py-1 rounded-full bg-zinc-200/80 hover:bg-zinc-300/80 text-xs font-bold text-[#0A0B0E] flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0A0B0E]" />
                        Max
                      </button>
                    </div>
                  </div>

                  {/* Dashed Swap Divider */}
                  <div className="relative flex items-center justify-center my-1">
                    <div className="w-full border-t border-dashed border-zinc-200" />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("BUY");
                        hideHeroOnInteract();
                      }}
                      className="absolute w-9 h-9 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center text-zinc-500 hover:text-[#0A0B0E] hover:scale-105 transition-all"
                      title="Switch to Buy USDT"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Second Box: Fiat Payout Output */}
                  <div className="rounded-2xl bg-[#FFFDF6] p-4 sm:p-5 hive-field-card !border-[#FDE68A]">
                    <div className="flex items-center justify-between text-xs mb-2 gap-2 flex-wrap">
                      <span className="font-bold text-[#0A0B0E]">
                        Receive {fiatCurrency}
                      </span>
                      <span className="font-mono text-zinc-500">
                        1 USDT = {formatCurrency(sellRate, fiatSymbol)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      <div className="min-w-0">
                        <div className="text-2xl sm:text-4xl font-black font-mono text-[#0A0B0E] truncate">
                          {formatCurrency(calculatedSellFiat, fiatSymbol)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsFiatPickerOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full bg-white border border-black/10 hover:border-[#FFC700] hover:bg-[#FFF8DB] shadow-sm shrink-0 transition-all text-xs font-extrabold text-[#0A0B0E]"
                        title="Click to select another payout currency"
                      >
                        <span className="text-base leading-none">
                          {activeFiatChannel.flag || "🌐"}
                        </span>
                        <span>{fiatCurrency}</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>
                  </div>

                  {isSellBelowMinimum && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        Minimum sell order is{" "}
                        <strong className="font-mono">
                          ${minTradeUsd.toFixed(2)} USDT
                        </strong>
                        .
                      </div>
                    </div>
                  )}

                  {/* First-Page Sell Permission Availability Notification */}
                  {!sellPermission.permitted && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2.5 text-xs text-amber-950">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-extrabold text-sm text-[#0A0B0E] block">
                            Payout in {activeFiatChannel.name} ({activeFiatChannel.code}) is Currently Disabled
                          </span>
                          <p className="text-zinc-600 leading-relaxed text-[11px]">
                            {sellPermission.reason ||
                              "Selling USDT to receive this currency is currently disabled by the treasury administrator."}
                          </p>
                        </div>
                      </div>
                      <div className="pt-1 flex items-center justify-between border-t border-amber-500/20">
                        <span className="text-[10px] font-bold text-amber-800">
                          Try choosing another listed payout currency
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsFiatPickerOpen(true)}
                          className="px-3.5 py-1.5 rounded-full bg-[#0A0B0E] text-[#FFC700] font-bold text-xs hover:bg-zinc-800 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <span>Change Currency</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Summary Breakdown Box */}
                  <div className="rounded-2xl bg-[#F7F8FA] p-4 space-y-2.5 text-xs hive-field-card">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">You receive</span>
                      <span className="font-mono font-extrabold text-[#0A0B0E]">
                        ≈ {formatCurrency(calculatedSellFiat, fiatSymbol)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Method</span>
                      <span className="font-semibold text-[#0A0B0E]">
                        Bank Transfer
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Settlement Network</span>
                      {isConnected ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0A0B0E]/5 text-[#0A0B0E] border border-black/10 text-xs font-bold font-mono">
                          <span>
                            {chainId === 101
                              ? "Solana (SPL USDT)"
                              : chainId === 1
                              ? "Ethereum (ERC-20)"
                              : chainId === 56
                              ? "BNB Chain (BEP-20)"
                              : chainId === 137
                              ? "Polygon (POL USDT)"
                              : chainId === 42161
                              ? "Arbitrum (ARB USDT)"
                              : activeNetwork.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0A0B0E] text-[#FFC700] font-sans font-extrabold tracking-wider">
                            Locked
                          </span>
                        </div>
                      ) : (
                        <select
                          value={chainId}
                          onChange={(e) => switchNetwork(Number(e.target.value))}
                          className="bg-white border border-zinc-200 text-xs font-bold text-[#0A0B0E] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#0A0B0E] cursor-pointer"
                        >
                          <option value={1}>Ethereum (ERC-20)</option>
                          <option value={56}>BNB Chain (BEP-20)</option>
                          <option value={137}>Polygon (POL USDT)</option>
                          <option value={42161}>Arbitrum (ARB USDT)</option>
                          <option value={101}>Solana (SPL USDT)</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Step 1 Continue Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isSellBelowMinimum || !sellPermission.permitted}
                      onClick={goToDetailsStep}
                      className="w-full py-4 px-6 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      <span>
                        {!sellPermission.permitted
                          ? `Payout Unavailable for ${fiatCurrency}`
                          : "Continue"}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#FFC700]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ===============================================================
               STEP 2: ACCOUNT DETAILS & SETTLEMENT (Exchange Form Hidden Until Back / Swipe Back)
               =============================================================== */
            <div
              key="details-step"
              className={`bg-white rounded-[26px] sm:rounded-[34px] p-5 sm:p-8 hive-container-card ${stepAnimationClass}`}
            >
              {activeTab === "BUY" ? (
                /* -------- STEP 2 BUY: CORPORATE BANK ACCOUNT TO PAY TO & PROOF -------- */
                <form
                  onSubmit={handleBuyOrderSubmit}
                  className="space-y-5"
                >
                  {/* 15-Minute Live Rate Lock & Dynamic Refresh Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF6] border border-[#FDE68A] space-y-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                            Locked Buy Amount
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFC700]/25 text-[#92400E] text-[10px] font-extrabold">
                            <Clock className="w-3 h-3 text-[#D97706]" />
                            15m Price Lock
                          </span>
                        </div>
                        <div className="text-base sm:text-lg font-black font-mono text-[#0A0B0E] mt-0.5">
                          {formatCurrency(currentBuyFiat, fiatSymbol)}{" "}
                          <span className="text-zinc-400 font-normal">→</span>{" "}
                          <span className="text-[#B45309]">
                            {currentBuyUsdt.toFixed(2)} USDT
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={goBackToAmountStep}
                        className="px-3.5 py-1.5 rounded-full bg-white border border-black/10 text-[11px] font-bold text-[#0A0B0E] hover:bg-zinc-50 shrink-0 shadow-sm transition-all"
                      >
                        Change
                      </button>
                    </div>

                    {/* Live 15-Minute Countdown Timer & Live Rate Info */}
                    <div className="pt-2.5 border-t border-[#FDE68A]/60 flex items-center justify-between gap-2.5 flex-wrap text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-black text-xs ${
                            lockSecondsRemaining <= 120
                              ? "bg-amber-100 text-[#92400E] border border-amber-300 animate-pulse"
                              : "bg-[#0A0B0E] text-[#FFC700]"
                          }`}
                        >
                          <Timer className="w-3.5 h-3.5" />
                          <span>{formatLockTimer(lockSecondsRemaining)}</span>
                        </div>
                        <div className="text-[11px] text-zinc-600">
                          <span>
                            {lockStartedTime
                              ? `Locked at ${lockStartedTime}`
                              : "Price locked"}{" "}
                            (@ {formatCurrency(buyRate, fiatSymbol, 2)}/USDT)
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAutoRefreshExpiredLock}
                        disabled={isLockRefreshing}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF8DB] hover:bg-[#FFC700]/40 text-[#92400E] text-[11px] font-extrabold transition-colors disabled:opacity-50"
                        title="Sync with live market rate"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${
                            isLockRefreshing
                              ? "animate-spin text-[#D97706]"
                              : ""
                          }`}
                        />
                        <span>
                          {isLockRefreshing
                            ? "Refreshing..."
                            : "Refresh Live Rate"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Designated Corporate Bank Account & User Reference Inputs */}
                  {hasAdminBankDetails ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#F7F8FA] hive-field-card space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-[#0A0B0E] flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-[#D97706]" />
                          {fiatCurrency} Bank Details
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFC700]/30 text-[#92400E]">
                          Transfer {formatCurrency(currentBuyFiat, fiatSymbol)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-white border border-black/5">
                          <span className="text-[10px] text-zinc-400 block">
                            Bank
                          </span>
                          <span className="font-bold text-[#0A0B0E]">
                            {activeFiatChannel.bankName || rateConfig?.bankName || "Treasury Pending"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-black/5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-zinc-400 block">
                              Account Number
                            </span>
                            <span className="font-mono font-extrabold text-[#0A0B0E]">
                              {activeFiatChannel.bankAccountNumber || rateConfig?.bankAccountNumber || "Pending"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                activeFiatChannel.bankAccountNumber || rateConfig?.bankAccountNumber || "",
                                "bank_acc"
                              )
                            }
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[#0A0B0E]"
                            title="Copy Account Number"
                          >
                            {copiedField === "bank_acc" ? (
                              <Check className="w-3.5 h-3.5 text-[#D97706]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-black/5">
                          <span className="text-[10px] text-zinc-400 block">
                            Account Name
                          </span>
                          <span className="font-bold text-[#0A0B0E] text-[11px]">
                            {activeFiatChannel.bankAccountName || rateConfig?.bankAccountName || "TREASURY SETTLEMENT"}
                          </span>
                        </div>
                      </div>

                      {activeFiatChannel.bankRoutingNote && (
                        <div className="p-2.5 rounded-xl bg-white border border-black/5 text-[11px] text-zinc-600 flex items-center gap-2">
                          <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{activeFiatChannel.bankRoutingNote}</span>
                        </div>
                      )}

                      {/* Auto-Generated Unique Payment Reference */}
                      <div className="p-3.5 rounded-xl bg-white border border-[#FDE68A] space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309] block">
                              Payment Reference / Receipt Code
                            </span>
                            <span className="font-mono text-sm sm:text-base font-black text-[#0A0B0E] select-all">
                              {paymentReference || "Generating..."}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={!paymentReference}
                            onClick={() =>
                              handleCopy(paymentReference, "pay_ref")
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF8DB] hover:bg-[#FFC700]/40 text-[#92400E] text-xs font-extrabold transition-colors"
                            title="Copy Payment Reference"
                          >
                            {copiedField === "pay_ref" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#D97706]" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="p-2.5 rounded-lg bg-[#FFF8DB]/80 border border-[#FDE68A] flex items-start gap-2 text-[11px] text-[#92400E] leading-relaxed">
                          <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                          <span>
                            <strong>Warning:</strong> Copy and paste{" "}
                            <strong className="font-mono text-[#0A0B0E]">
                              {paymentReference}
                            </strong>{" "}
                            into your bank transfer narration / transaction
                            reference so your payment is matched and confirmed fast.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-[#FFF8DB] border border-[#FDE68A] text-center space-y-3.5">
                      <div className="w-12 h-12 mx-auto rounded-full bg-[#FFC700]/25 flex items-center justify-center text-[#B45309]">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-[#0A0B0E]">
                          Payment to this Country is Currently Unavailable
                        </h4>
                        <p className="text-xs text-[#92400E] max-w-sm mx-auto leading-relaxed">
                          Fiat deposit channels for {fiatCurrency} are currently unavailable or undergoing maintenance. Bank account details have not been assigned by the administrator.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-black/5 text-[11px] text-zinc-500">
                        Please check back shortly, trade via Sell USDT, or contact our 24/7 Desk Administrator.
                      </div>
                      <button
                        type="button"
                        onClick={() => setFlowStep("AMOUNT")}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0A0B0E] text-white text-xs font-bold hover:bg-zinc-800 transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Return to Exchange</span>
                      </button>
                    </div>
                  )}

                  {/* Primary CTA */}
                  <div className="pt-1">
                    {hasAdminBankDetails ? (
                      <button
                        type="submit"
                        disabled={isSubmittingBuy || isBuyBelowMinimum}
                        className="w-full py-4 px-6 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                      >
                        {isSubmittingBuy ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-[#FFC700]" />
                            <span>Processing...</span>
                          </>
                        ) : !isConnected ? (
                          <span>Connect Wallet to Submit Buy Order</span>
                        ) : (
                          <span>Payment Done</span>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-4 px-6 rounded-full bg-zinc-200 text-zinc-400 font-bold text-xs sm:text-sm cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>Payment to this Country is Unavailable</span>
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                /* -------- STEP 2 SELL: RECEIVING BANK ACCOUNT DETAILS FORM -------- */
                <form
                  onSubmit={handleSellOrderSubmit}
                  className="space-y-5"
                >
                  {/* 15-Minute Live Rate Lock & Dynamic Refresh Card for SELL */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF6] border border-[#FDE68A] space-y-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
                            Locked Sell Amount
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFC700]/25 text-[#92400E] text-[10px] font-extrabold">
                            <Clock className="w-3 h-3 text-[#D97706]" />
                            15m Price Lock
                          </span>
                          {sellPaymentReference && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/5 text-zinc-600 text-[10px] font-mono font-bold">
                              {sellPaymentReference}
                            </span>
                          )}
                        </div>
                        <div className="text-base sm:text-lg font-black font-mono text-[#0A0B0E] mt-0.5">
                          {currentSellUsdt.toFixed(2)} USDT{" "}
                          <span className="text-zinc-400 font-normal">→</span>{" "}
                          <span className="text-[#B45309]">
                            {formatCurrency(
                              lockedSellOrder?.fiatAmount || calculatedSellFiat,
                              fiatSymbol
                            )}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={goBackToAmountStep}
                        className="px-3.5 py-1.5 rounded-full bg-white border border-black/10 text-[11px] font-bold text-[#0A0B0E] hover:bg-zinc-50 shrink-0 shadow-sm transition-all"
                      >
                        Change
                      </button>
                    </div>

                    {/* Live 15-Minute Countdown Timer & Live Rate Info */}
                    <div className="pt-2.5 border-t border-[#FDE68A]/60 flex items-center justify-between gap-2.5 flex-wrap text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-black text-xs ${
                            sellLockSecondsRemaining <= 120
                              ? "bg-amber-100 text-[#92400E] border border-amber-300 animate-pulse"
                              : "bg-[#0A0B0E] text-[#FFC700]"
                          }`}
                        >
                          <Timer className="w-3.5 h-3.5" />
                          <span>{formatLockTimer(sellLockSecondsRemaining)}</span>
                        </div>
                        <div className="text-[11px] text-zinc-600">
                          <span>
                            {sellLockStartedTime
                              ? `Locked at ${sellLockStartedTime}`
                              : "Price locked"}{" "}
                            (@ {formatCurrency(lockedSellOrder?.exchangeRateApplied || sellRate, fiatSymbol, 2)}/USDT)
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAutoRefreshExpiredSellLock}
                        disabled={isSellLockRefreshing}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF8DB] hover:bg-[#FFC700]/40 text-[#92400E] text-[11px] font-extrabold transition-colors disabled:opacity-50"
                        title="Sync with live market rate"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${
                            isSellLockRefreshing
                              ? "animate-spin text-[#D97706]"
                              : ""
                          }`}
                        />
                        <span>
                          {isSellLockRefreshing
                            ? "Refreshing..."
                            : "Refresh Live Rate"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* User Receiving Bank Details */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F7F8FA] hive-field-card space-y-3.5">
                    <span className="text-xs font-extrabold text-[#0A0B0E] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#0A0B0E]" />
                      Your Receiving Bank Account Details
                    </span>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          value={userBankName}
                          onChange={(e) => setUserBankName(e.target.value)}
                          placeholder="e.g. Zenith Bank / Access Bank"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-black/10 text-xs text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                          Account Number *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={userAccountNumber}
                          onKeyDown={(e) => {
                            if (
                              [
                                "Backspace",
                                "Delete",
                                "Tab",
                                "Escape",
                                "Enter",
                                "ArrowLeft",
                                "ArrowRight",
                                "ArrowUp",
                                "ArrowDown",
                                "Home",
                                "End",
                              ].includes(e.key) ||
                              (e.ctrlKey || e.metaKey)
                            ) {
                              return;
                            }
                            if (!/^[0-9]$/.test(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => setUserAccountNumber(e.target.value.replace(/\D/g, ""))}
                          placeholder="0123456789"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-black/10 text-xs font-mono text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                          Account Holder Name *
                        </label>
                        <input
                          type="text"
                          value={userAccountName}
                          onChange={(e) => setUserAccountName(e.target.value)}
                          placeholder="KINGSLEY ADEYEMI"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-black/10 text-xs text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="rounded-2xl bg-[#F7F8FA] p-4 space-y-2 text-xs hive-field-card">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Fiat Payout</span>
                      <span className="font-mono font-extrabold text-[#0A0B0E]">
                        {formatCurrency(
                          lockedSellOrder?.fiatAmount || calculatedSellFiat,
                          fiatSymbol
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Method</span>
                      <span className="font-semibold text-[#0A0B0E]">
                        Bank Transfer
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Settlement Network</span>
                      {isConnected ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0A0B0E]/5 text-[#0A0B0E] border border-black/10 text-xs font-bold font-mono">
                          <span>
                            {chainId === 101
                              ? "Solana (SPL USDT)"
                              : chainId === 1
                              ? "Ethereum (ERC-20)"
                              : chainId === 56
                              ? "BNB Chain (BEP-20)"
                              : chainId === 137
                              ? "Polygon (POL USDT)"
                              : chainId === 42161
                              ? "Arbitrum (ARB USDT)"
                              : activeNetwork.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0A0B0E] text-[#FFC700] font-sans font-extrabold tracking-wider">
                            Locked
                          </span>
                        </div>
                      ) : (
                        <select
                          value={chainId}
                          onChange={(e) => switchNetwork(Number(e.target.value))}
                          className="bg-white border border-zinc-200 text-xs font-bold text-[#0A0B0E] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#0A0B0E] cursor-pointer"
                        >
                          <option value={1}>Ethereum (ERC-20)</option>
                          <option value={56}>BNB Chain (BEP-20)</option>
                          <option value={137}>Polygon (POL USDT)</option>
                          <option value={42161}>Arbitrum (ARB USDT)</option>
                          <option value={101}>Solana (SPL USDT)</option>
                        </select>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-black/5">
                      <span className="text-zinc-500">Treasury Deposit Wallet</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-[#0A0B0E]">
                        <span>
                          {formatAddress(
                            getTreasuryWalletForNetwork(
                              isSolanaConnected ? 101 : chainId,
                              rateConfig?.treasuryWallet
                            )
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              getTreasuryWalletForNetwork(
                                isSolanaConnected ? 101 : chainId,
                                rateConfig?.treasuryWallet
                              ),
                              "treasury_recv"
                            )
                          }
                          className="text-zinc-400 hover:text-black p-0.5"
                          title="Copy Treasury Receiving Wallet"
                        >
                          {copiedField === "treasury_recv" ? (
                            <Check className="w-3 h-3 text-[#D97706]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Primary Black Pill Submit Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSigningSell || isSellBelowMinimum}
                      className="w-full py-4 px-6 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      {isSigningSell ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#FFC700]" />
                          <span>Awaiting Web3 Wallet Signature...</span>
                        </>
                      ) : !isConnected ? (
                        <span>Connect Wallet to Submit Sell Order</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-[#FFC700]" />
                          <span>
                            Review &amp; Sign {currentSellUsdt.toFixed(2)} USDT
                            Order
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
        )}

        {/* =====================================================================
            SECTION 3: RECENT USER TRANSACTIONS TABLE (Only Shown When Connected & Clicked from Hamburger Menu)
           ===================================================================== */}
        {isConnected && Boolean(walletAddress) && activeView === "LEDGER" && (
          <section
            id="recent-orders"
            onClick={hideHeroOnInteract}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`w-full max-w-6xl mx-auto my-auto rounded-[26px] sm:rounded-[34px] bg-white hive-container-card overflow-hidden ${stepAnimationClass}`}
          >
            <div className="px-5 sm:px-7 py-5 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={goBackToAmountStep}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7F8FA] hover:bg-zinc-200/80 text-xs font-extrabold text-[#0A0B0E] transition-all active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4 text-[#0A0B0E]" />
                  <span>Back</span>
                </button>
                <div className="w-9 h-9 rounded-full bg-[#FFC700] flex items-center justify-center text-black font-bold shrink-0">
                  ₮
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#0A0B0E]">
                    Transactions
                  </h2>
                </div>
              </div>

              <button
                onClick={() => {
                  fetchUserOrders();
                  hideHeroOnInteract();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F7F8FA] hover:bg-zinc-200/70 text-xs font-bold text-[#0A0B0E] transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoadingOrders ? "animate-spin" : ""}`}
                />
                <span>Sync Transactions</span>
              </button>
            </div>

            {!isConnected || !walletAddress ? (
              <div className="p-10 sm:p-12 text-center space-y-4">
                <p className="text-sm font-bold text-[#0A0B0E]">
                  Connect Your Wallet to View Transactions
                </p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Connect your Web3 wallet to inspect your Cryptohive DeFi order
                  history and settlement receipts.
                </p>
                <button
                  type="button"
                  onClick={() => setWalletModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-xs shadow-lg transition-all"
                >
                  <Wallet className="w-4 h-4 text-[#FFC700]" />
                  <span>Connect Wallet</span>
                </button>
              </div>
            ) : userOrders.length === 0 ? (
              <div className="p-10 sm:p-12 text-center space-y-2">
                <p className="text-sm font-bold text-[#0A0B0E]">
                  No Transactions Recorded Yet
                </p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Submit a Buy or Sell order to track live settlement status
                  badges and on-chain hashes.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[680px]">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-[#F9FAFB]">
                      <th className="py-3.5 px-5 sm:px-6">Order ID</th>
                      <th className="py-3.5 px-4">Direction</th>
                      <th className="py-3.5 px-4">USDT Volume</th>
                      <th className="py-3.5 px-4">Fiat Total</th>
                      <th className="py-3.5 px-4">Locked Rate</th>
                      <th className="py-3.5 px-4">Proof / TxHash</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-5 sm:px-6 text-right">
                        Receipt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs">
                    {userOrders.map((order) => {
                      const isBuy = order.orderType === "BUY";
                      const proofHash = isBuy
                        ? order.treasuryPayoutTxHash || order.paymentReference
                        : order.cryptoDepositTxHash;
                      const net =
                        SUPPORTED_NETWORKS[order.networkChainId] ||
                        SUPPORTED_NETWORKS[1];

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-[#F9FAFB] transition-colors"
                        >
                          <td className="py-4 px-5 sm:px-6 font-mono font-bold text-[#0A0B0E]">
                            {order.referenceCode}
                            <div className="text-[10px] text-zinc-400 font-sans font-normal mt-0.5">
                              {new Date(order.createdAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap ${
                                isBuy
                                  ? "bg-[#0A0B0E] text-[#FFC700]"
                                  : "bg-[#FFF8DB] text-[#B45309] border border-[#FDE68A]"
                              }`}
                            >
                              {isBuy ? "BUY USDT" : "SELL USDT"}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-[#0A0B0E]">
                            {order.usdtAmount.toFixed(2)} USDT
                            <div className="text-[10px] text-zinc-400 font-sans font-normal">
                              {order.networkName}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-[#0A0B0E]">
                            {formatCurrency(order.fiatAmount, order.fiatSymbol)}
                          </td>
                          <td className="py-4 px-4 font-mono text-zinc-500">
                            {formatCurrency(
                              order.exchangeRateApplied,
                              order.fiatSymbol
                            )}
                          </td>
                          <td className="py-4 px-4 font-mono text-zinc-500">
                            {proofHash ? (
                              <div className="flex items-center gap-1.5">
                                <span className="truncate max-w-[120px]">
                                  {proofHash}
                                </span>
                                {proofHash.startsWith("0x") && (
                                  <a
                                    href={`${net.explorerUrl}/tx/${proofHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#D97706] hover:underline"
                                    title="View on Block Explorer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="py-4 px-5 sm:px-6 text-right">
                            <button
                              onClick={() => {
                                setSlideDirection("forward");
                                setActiveView("EXCHANGE");
                                setSubmittedOrderReceipt(order);
                                setPaymentButtonStep(
                                  order.status === "pending_payment"
                                    ? "idle"
                                    : "hidden"
                                );
                                hideHeroOnInteract();
                                if (typeof window !== "undefined") {
                                  window.history.pushState(
                                    { cryptohiveStep: "RECEIPT" },
                                    ""
                                  );
                                  window.scrollTo({
                                    top: 80,
                                    behavior: "smooth",
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-[11px] transition-colors"
                            >
                              <Info className="w-3 h-3 text-[#FFC700]" />
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Searchable Multi-Fiat Currency Selector Modal */}
      <FiatCurrencyModal
        isOpen={isFiatPickerOpen}
        onClose={() => setIsFiatPickerOpen(false)}
        mode={activeTab}
        selectedCode={activeFiatChannel.code}
        onSelect={(code) => setSelectedFiatCode(code)}
        fiatChannels={fiatChannels}
      />
    </div>
  );
}
