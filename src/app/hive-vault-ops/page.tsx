"use client";

import React, { useEffect, useState, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { WalletConnectModal } from "@/components/WalletConnectModal";
import { ToastContainer } from "@/components/ToastContainer";
import { StatusBadge } from "@/components/StatusBadge";
import { useApexStore, OtcOrderItem } from "@/store/useApexStore";
import {
  SUPPORTED_NETWORKS,
  formatAddress,
  formatCurrency,
  isAdminWalletAddress,
  parseNetworkTreasuryWallets,
  getAdminWhitelistedWallets,
  isValidCryptoAddress,
  isEvmWalletAddress,
  isValidSolanaAddress,
} from "@/lib/web3";
import {
  Shield,
  Sliders,
  Bell,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Send,
  Mail,
  MessageSquare,
  History,
  Building2,
  Save,
  TrendingUp,
  CheckCheck,
  Sparkles,
  Copy,
  Check,
  Lock,
  Unlock,
  KeyRound,
  AlertTriangle,
  Wallet,
  ShieldAlert,
  Plus,
  Trash2,
  Layers,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  FiatChannel,
  GLOBAL_FIAT_METADATA,
  parseFiatChannels,
  DEFAULT_INITIAL_FIAT_CHANNELS,
} from "@/lib/fiatChannels";

export default function CryptohiveSecretAdminVaultPage() {
  const {
    walletAddress,
    isConnected,
    rateConfig,
    fiatChannels,
    adminOrders,
    adminNotifications,
    unreadNotificationsCount,
    pendingOrdersCount,
    auditLogs,
    channelsConfigured,
    fetchRates,
    updateRates,
    fetchAdminData,
    markNotificationsRead,
    addToast,
    setWalletModalOpen,
    disconnectWallet,
  } = useApexStore();

  const [buyRateInput, setBuyRateInput] = useState<string>("");
  const [sellRateInput, setSellRateInput] = useState<string>("");
  const [usdRefInput, setUsdRefInput] = useState<string>("");
  const [treasuryWalletInput, setTreasuryWalletInput] = useState<string>("");

  // Per-Network Treasury Receiving Wallets (USDT)
  const [ethTreasuryInput, setEthTreasuryInput] = useState<string>("");
  const [bscTreasuryInput, setBscTreasuryInput] = useState<string>("");
  const [polyTreasuryInput, setPolyTreasuryInput] = useState<string>("");
  const [arbTreasuryInput, setArbTreasuryInput] = useState<string>("");
  const [solTreasuryInput, setSolTreasuryInput] = useState<string>("");

  // Whitelisted Admin Login Wallets (Multi-Wallet Access)
  const [whitelistedWallets, setWhitelistedWallets] = useState<string[]>([]);
  const [newAdminWalletInput, setNewAdminWalletInput] = useState<string>("");

  const [bankNameInput, setBankNameInput] = useState<string>("");
  const [bankAccNumberInput, setBankAccNumberInput] = useState<string>("");
  const [bankAccNameInput, setBankAccNameInput] = useState<string>("");
  const [spreadAmountInput, setSpreadAmountInput] = useState<string>("");
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [isSyncingLive, setIsSyncingLive] = useState(false);

  // Multi-Fiat Rails & Permissions Management State
  const [adminChannels, setAdminChannels] = useState<FiatChannel[]>([]);
  const [isSavingChannels, setIsSavingChannels] = useState(false);
  const [selectedNewFiatToAdd, setSelectedNewFiatToAdd] = useState<string>("");
  const [expandedChannelCode, setExpandedChannelCode] = useState<string | null>("NGN");

  // Prevent background store polling from wiping user edits
  const hasLoadedInitialChannelsRef = useRef(false);

  useEffect(() => {
    if (hasLoadedInitialChannelsRef.current) return;

    if (fiatChannels && fiatChannels.length > 0) {
      setAdminChannels(fiatChannels);
      hasLoadedInitialChannelsRef.current = true;
    } else if (rateConfig?.fiatChannelsJson) {
      setAdminChannels(parseFiatChannels(rateConfig.fiatChannelsJson));
      hasLoadedInitialChannelsRef.current = true;
    } else if (rateConfig) {
      setAdminChannels([...DEFAULT_INITIAL_FIAT_CHANNELS]);
      hasLoadedInitialChannelsRef.current = true;
    }
  }, [fiatChannels, rateConfig]);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cryptographic Admin Wallet Whitelist & Gate Authentication State
  const isAuthorizedAdminWallet = Boolean(
    isConnected &&
      walletAddress &&
      isAdminWalletAddress(walletAddress, rateConfig?.bankRoutingNote)
  );
  const [adminPinInput, setAdminPinInput] = useState<string>("");
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Verify and maintain session while the authorized admin wallet remains connected
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("chv_admin_auth");
    if (
      stored &&
      walletAddress &&
      isAuthorizedAdminWallet &&
      stored.toLowerCase() === walletAddress.toLowerCase()
    ) {
      setIsUnlocked(true);
    } else {
      setIsUnlocked(false);
    }
  }, [walletAddress, isAuthorizedAdminWallet]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!isConnected || !walletAddress) {
      setAuthError("Please connect your Web3 wallet first.");
      setWalletModalOpen(true);
      return;
    }

    if (!isAuthorizedAdminWallet) {
      setAuthError(
        "Access Denied: Connected wallet is not on the Cryptohive Admin whitelist. Please switch to an authorized admin wallet."
      );
      return;
    }

    const expectedPin =
      process.env.NEXT_PUBLIC_ADMIN_ACCESS_PIN || "8800";
    if (adminPinInput.trim() !== expectedPin) {
      setAuthError("Invalid Admin PIN. Please verify your access key.");
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsUnlocked(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("chv_admin_auth", walletAddress);
      }
      addToast({
        title: "Admin Vault Authenticated",
        description: `Session verified for ${formatAddress(walletAddress)}. Full treasury access unlocked.`,
        variant: "success",
      });
    }, 350);
  };

  const handleLockSession = () => {
    setIsUnlocked(false);
    setAdminPinInput("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("chv_admin_auth");
    }
    addToast({
      title: "Admin Session Locked",
      description: "Vault locked. Re-authentication required.",
      variant: "info",
    });
  };

  // Prevent background store polling from wiping rate & treasury edits
  const hasLoadedInitialRatesRef = useRef(false);

  useEffect(() => {
    if (rateConfig && !hasLoadedInitialRatesRef.current) {
      hasLoadedInitialRatesRef.current = true;
      setBuyRateInput(String(rateConfig.buyRate));
      setSellRateInput(String(rateConfig.sellRate));
      setUsdRefInput(String(rateConfig.usdReferenceRate));
      const initSpread = rateConfig.buyRate - rateConfig.sellRate;
      setSpreadAmountInput(
        (!isNaN(initSpread) && initSpread > 0 ? initSpread : 37.49).toFixed(2)
      );
      setTreasuryWalletInput(rateConfig.treasuryWallet);
      setBankNameInput(rateConfig.bankName);
      setBankAccNumberInput(rateConfig.bankAccountNumber);
      setBankAccNameInput(rateConfig.bankAccountName);

      const netWallets = parseNetworkTreasuryWallets(rateConfig.treasuryWallet);
      setEthTreasuryInput(netWallets[1] || "");
      setBscTreasuryInput(netWallets[56] || "");
      setPolyTreasuryInput(netWallets[137] || "");
      setArbTreasuryInput(netWallets[42161] || "");
      setSolTreasuryInput(netWallets[101] || "");

      const currentAdmins = getAdminWhitelistedWallets(
        rateConfig.bankRoutingNote
      );
      setWhitelistedWallets(currentAdmins);

      if (fiatChannels && fiatChannels.length > 0) {
        setAdminChannels(fiatChannels);
      } else if (rateConfig.fiatChannelsJson) {
        setAdminChannels(parseFiatChannels(rateConfig.fiatChannelsJson));
      }
    }
  }, [rateConfig]);

  const handleAddAdminWallet = () => {
    const clean = newAdminWalletInput.trim();
    if (!clean) return;
    if (!isValidCryptoAddress(clean)) {
      addToast({
        title: "Invalid Wallet Address",
        description:
          "Please enter a valid EVM (0x...) or Solana (Base58) wallet address.",
        variant: "error",
      });
      return;
    }
    if (whitelistedWallets.some((w) => w.toLowerCase() === clean.toLowerCase())) {
      addToast({
        title: "Already Whitelisted",
        description: "This wallet address is already in the authorized admin whitelist.",
        variant: "info",
      });
      return;
    }
    setWhitelistedWallets((prev) => [...prev, clean]);
    setNewAdminWalletInput("");
    addToast({
      title: "Admin Wallet Added to Whitelist",
      description: `Added ${formatAddress(clean)}. Click 'Save Vault Changes' to persist to database.`,
      variant: "success",
    });
  };

  const handleRemoveAdminWallet = (addrToRemove: string) => {
    if (
      walletAddress &&
      addrToRemove.toLowerCase() === walletAddress.toLowerCase()
    ) {
      addToast({
        title: "Cannot Remove Active Session",
        description:
          "You cannot remove the admin wallet you are currently connected and logged in with.",
        variant: "warning",
      });
      return;
    }
    setWhitelistedWallets((prev) =>
      prev.filter((w) => w.toLowerCase() !== addrToRemove.toLowerCase())
    );
    addToast({
      title: "Admin Wallet Removed",
      description: `Removed ${formatAddress(addrToRemove)}. Click 'Save Vault Changes' to persist.`,
      variant: "info",
    });
  };

  const handleSyncEvmToAll = () => {
    if (!ethTreasuryInput.trim() || !isEvmWalletAddress(ethTreasuryInput)) {
      addToast({
        title: "Invalid Ethereum Address",
        description: "Please enter a valid Ethereum EVM address first.",
        variant: "error",
      });
      return;
    }
    const val = ethTreasuryInput.trim();
    setBscTreasuryInput(val);
    setPolyTreasuryInput(val);
    setArbTreasuryInput(val);
    addToast({
      title: "Synced to All EVM Networks",
      description:
        "Copied Ethereum address to BNB Chain, Polygon, and Arbitrum receivers.",
      variant: "success",
    });
  };

  // Two-way interactive Profit Spread Handlers
  const handleSpreadChange = (newSpreadVal: string) => {
    setSpreadAmountInput(newSpreadVal);
    const numSpread = parseFloat(newSpreadVal);
    if (!isNaN(numSpread) && numSpread >= 0) {
      const baseRef =
        parseFloat(usdRefInput) ||
        (parseFloat(buyRateInput) && parseFloat(sellRateInput)
          ? (parseFloat(buyRateInput) + parseFloat(sellRateInput)) / 2
          : 1350);
      const half = numSpread / 2;
      const newBuy = Number((baseRef + half).toFixed(2));
      const newSell = Number((baseRef - half).toFixed(2));
      setBuyRateInput(String(newBuy));
      setSellRateInput(String(newSell));
    }
  };

  const handleApplyPresetSpread = (presetAmt: number) => {
    handleSpreadChange(String(presetAmt));
  };

  const handleBuyRateChange = (newBuy: string) => {
    setBuyRateInput(newBuy);
    const b = parseFloat(newBuy);
    const s = parseFloat(sellRateInput);
    if (!isNaN(b) && !isNaN(s) && b >= s) {
      setSpreadAmountInput((b - s).toFixed(2));
    }
  };

  const handleSellRateChange = (newSell: string) => {
    setSellRateInput(newSell);
    const b = parseFloat(buyRateInput);
    const s = parseFloat(newSell);
    if (!isNaN(b) && !isNaN(s) && b >= s) {
      setSpreadAmountInput((b - s).toFixed(2));
    }
  };

  const handleUsdRefChange = (newRef: string) => {
    setUsdRefInput(newRef);
    const base = parseFloat(newRef);
    const spread = parseFloat(spreadAmountInput);
    if (!isNaN(base) && base > 0 && !isNaN(spread) && spread >= 0) {
      const half = spread / 2;
      setBuyRateInput(Number((base + half).toFixed(2)).toString());
      setSellRateInput(Number((base - half).toFixed(2)).toString());
    }
  };

  // Only poll and fetch admin data when authorized and unlocked
  useEffect(() => {
    if (!isUnlocked || !isAuthorizedAdminWallet) return;

    fetchAdminData({
      status: statusFilter,
      orderType: typeFilter,
      search: searchQuery,
    });

    const interval = setInterval(() => {
      fetchAdminData({
        status: statusFilter,
        orderType: typeFilter,
        search: searchQuery,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isUnlocked, isAuthorizedAdminWallet, statusFilter, typeFilter, searchQuery, fetchAdminData]);

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const parsedBuy = parseFloat(buyRateInput) || 0;
  const parsedSell = parseFloat(sellRateInput) || 0;
  const parsedRef = parseFloat(usdRefInput) || 1;
  const previewBuySpread = (((parsedBuy - parsedRef) / parsedRef) * 100).toFixed(
    2
  );
  const previewSellSpread = (
    ((parsedRef - parsedSell) / parsedRef) *
    100
  ).toFixed(2);
  const netDeskSpreadFiat = parsedBuy - parsedSell;

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRates(true);
    try {
      const ok = await updateRates({
        buyRate: parseFloat(buyRateInput),
        sellRate: parseFloat(sellRateInput),
        usdReferenceRate: parseFloat(usdRefInput),
        networkTreasuryWallets: {
          1: ethTreasuryInput.trim(),
          56: bscTreasuryInput.trim(),
          137: polyTreasuryInput.trim(),
          42161: arbTreasuryInput.trim(),
          101: solTreasuryInput.trim(),
        },
        adminWallets: whitelistedWallets,
        bankName: bankNameInput.trim(),
        bankAccountNumber: bankAccNumberInput.trim(),
        bankAccountName: bankAccNameInput.trim(),
        adminAddress: walletAddress || "",
      });
      if (ok) {
        await fetchRates();
        await fetchAdminData({
          status: statusFilter,
          orderType: typeFilter,
          search: searchQuery,
        });
      }
    } finally {
      setIsSavingRates(false);
    }
  };

  const handleToggleBuyChannel = (code: string) => {
    setAdminChannels((prev) =>
      prev.map((c) =>
        c.code === code ? { ...c, buyEnabled: !c.buyEnabled } : c
      )
    );
  };

  const handleToggleSellChannel = (code: string) => {
    setAdminChannels((prev) =>
      prev.map((c) =>
        c.code === code ? { ...c, sellEnabled: !c.sellEnabled } : c
      )
    );
  };

  const handleChannelFieldChange = (
    code: string,
    field: keyof FiatChannel,
    val: any
  ) => {
    setAdminChannels((prev) =>
      prev.map((c) => {
        if (c.code !== code) return c;
        const updated = { ...c, [field]: val };
        if (field === "usdReferenceRate") {
          const ref = Number(val) || 1;
          updated.buyRate = Number(
            (ref * (1 + (updated.buySpreadPercent || 1.8) / 100)).toFixed(2)
          );
          updated.sellRate = Number(
            (ref * (1 - (updated.sellSpreadPercent || 1.5) / 100)).toFixed(2)
          );
        } else if (field === "buySpreadPercent") {
          const spread = Number(val) || 0;
          updated.buyRate = Number(
            ((updated.usdReferenceRate || 1) * (1 + spread / 100)).toFixed(2)
          );
        } else if (field === "sellSpreadPercent") {
          const spread = Number(val) || 0;
          updated.sellRate = Number(
            ((updated.usdReferenceRate || 1) * (1 - spread / 100)).toFixed(2)
          );
        }
        return updated;
      })
    );
  };

  const handleAddNewFiatChannel = () => {
    if (!selectedNewFiatToAdd) return;
    const meta = GLOBAL_FIAT_METADATA[selectedNewFiatToAdd];
    if (!meta) return;

    if (adminChannels.some((c) => c.code === meta.code)) {
      addToast({
        title: "Currency Already Listed",
        description: `${meta.name} (${meta.code}) is already in your rails configuration.`,
        variant: "info",
      });
      return;
    }

    const newChannel: FiatChannel = {
      code: meta.code,
      name: meta.name,
      symbol: meta.symbol,
      flag: meta.flag,
      usdReferenceRate: meta.defaultRate,
      buyRate: Number((meta.defaultRate * 1.018).toFixed(2)),
      sellRate: Number((meta.defaultRate * 0.982).toFixed(2)),
      buySpreadPercent: 1.8,
      sellSpreadPercent: 1.5,
      buyEnabled: false,
      sellEnabled: false,
      minTradeUsd: 1.0,
      maxTradeUsd: 50000.0,
      bankName: "",
      bankAccountNumber: "",
      bankAccountName: "",
      bankRoutingNote: "",
    };

    setAdminChannels((prev) => [...prev, newChannel]);
    setExpandedChannelCode(meta.code);
    setSelectedNewFiatToAdd("");
    addToast({
      title: "Fiat Channel Added",
      description: `Added ${meta.name} (${meta.code}). Please enter bank details and toggle permissions to activate.`,
      variant: "success",
    });
  };

  const handleRemoveFiatChannel = (code: string) => {
    if (adminChannels.length <= 1) {
      addToast({
        title: "Cannot Remove Last Currency",
        description: "You must keep at least one fiat currency channel.",
        variant: "error",
      });
      return;
    }
    setAdminChannels((prev) => prev.filter((c) => c.code !== code));
    addToast({
      title: "Fiat Channel Removed",
      description: `Removed ${code} from active rails. Click Save to persist.`,
      variant: "info",
    });
  };

  const handleSaveMultiFiatRails = async () => {
    setIsSavingChannels(true);
    try {
      const ngnChannel =
        adminChannels.find((c) => c.code === "NGN") || adminChannels[0];
      const sessionAdmin =
        typeof window !== "undefined"
          ? sessionStorage.getItem("chv_admin_auth")
          : null;
      const payload: any = {
        fiatChannels: adminChannels,
        adminAddress: walletAddress || sessionAdmin || "",
      };
      if (ngnChannel) {
        payload.buyRate = ngnChannel.buyRate;
        payload.sellRate = ngnChannel.sellRate;
        payload.usdReferenceRate = ngnChannel.usdReferenceRate;
        if (ngnChannel.bankName) payload.bankName = ngnChannel.bankName;
        if (ngnChannel.bankAccountNumber)
          payload.bankAccountNumber = ngnChannel.bankAccountNumber;
        if (ngnChannel.bankAccountName)
          payload.bankAccountName = ngnChannel.bankAccountName;
      }

      const ok = await updateRates(payload);
      if (ok) {
        await fetchRates();
        addToast({
          title: "Multi-Fiat Rails Saved! 🚀",
          description: `Persisted ${adminChannels.length} fiat channels with their buy/sell permissions and corporate bank rails.`,
          variant: "success",
        });
      }
    } finally {
      setIsSavingChannels(false);
    }
  };

  const handleResetFromDb = () => {
    if (rateConfig) {
      setBuyRateInput(String(rateConfig.buyRate));
      setSellRateInput(String(rateConfig.sellRate));
      setUsdRefInput(String(rateConfig.usdReferenceRate));
      const resetSpread = rateConfig.buyRate - rateConfig.sellRate;
      setSpreadAmountInput(
        (!isNaN(resetSpread) && resetSpread > 0 ? resetSpread : 37.49).toFixed(2)
      );
      setBankNameInput(rateConfig.bankName);
      setBankAccNumberInput(rateConfig.bankAccountNumber);
      setBankAccNameInput(rateConfig.bankAccountName);

      const netWallets = parseNetworkTreasuryWallets(rateConfig.treasuryWallet);
      setEthTreasuryInput(netWallets[1] || "");
      setBscTreasuryInput(netWallets[56] || "");
      setPolyTreasuryInput(netWallets[137] || "");
      setArbTreasuryInput(netWallets[42161] || "");
      setSolTreasuryInput(netWallets[101] || "");

      const currentAdmins = getAdminWhitelistedWallets(
        rateConfig.bankRoutingNote
      );
      setWhitelistedWallets(currentAdmins);

      if (fiatChannels && fiatChannels.length > 0) {
        setAdminChannels(fiatChannels);
      } else if (rateConfig.fiatChannelsJson) {
        setAdminChannels(parseFiatChannels(rateConfig.fiatChannelsJson));
      }

      addToast({
        title: "Fields Restored from Database",
        description: "Inputs re-aligned with current live database records.",
        variant: "info",
      });
    }
  };

  const handleSyncLiveMarket = async () => {
    setIsSyncingLive(true);
    try {
      const res = await fetch("/api/rates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-wallet": walletAddress || "",
        },
        body: JSON.stringify({
          syncLiveMarket: true,
          adminAddress: walletAddress || "",
        }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        const liveBase = data.config.usdReferenceRate;
        const currentTargetSpread = parseFloat(spreadAmountInput);
        if (!isNaN(currentTargetSpread) && currentTargetSpread > 0) {
          const half = currentTargetSpread / 2;
          const newBuy = Number((liveBase + half).toFixed(2));
          const newSell = Number((liveBase - half).toFixed(2));
          setUsdRefInput(String(liveBase));
          setBuyRateInput(String(newBuy));
          setSellRateInput(String(newSell));
        } else {
          setBuyRateInput(String(data.config.buyRate));
          setSellRateInput(String(data.config.sellRate));
          setUsdRefInput(String(data.config.usdReferenceRate));
          const syncedSpread = data.config.buyRate - data.config.sellRate;
          setSpreadAmountInput(
            (!isNaN(syncedSpread) && syncedSpread > 0 ? syncedSpread : 37.49).toFixed(2)
          );
        }
        await fetchRates();
        addToast({
          title: "Live Market Rates Synced!",
          description: `Rates updated to live oracle: ₦${data.config.usdReferenceRate.toLocaleString()}/USDT`,
          variant: "success",
        });
      }
    } catch {
      addToast({
        title: "Live Sync Failed",
        description: "Could not reach public market oracle.",
        variant: "error",
      });
    } finally {
      setIsSyncingLive(false);
    }
  };

  const handleOrderAction = async (
    order: OtcOrderItem,
    action:
      | "CONFIRM_AND_CREDIT"
      | "APPROVE_PAYMENT"
      | "MARK_COMPLETED"
      | "REJECT_ORDER"
  ) => {
    setProcessingOrderId(order.id);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-wallet": walletAddress || "",
        },
        body: JSON.stringify({
          action,
          adminAddress: walletAddress || "",
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Order action failed.");
      }

      if (action === "CONFIRM_AND_CREDIT") {
        addToast({
          title: "Treasury Payout Executed! 🚀",
          description: `Credited ${order.usdtAmount.toFixed(2)} USDT to ${formatAddress(order.receivingWallet)}. Telegram & Email alerts sent!`,
          variant: "success",
        });
      } else if (action === "MARK_COMPLETED") {
        addToast({
          title: "Order Marked Completed ✓",
          description: `Order ${order.referenceCode} settled. Telegram & Email alerts sent!`,
          variant: "success",
        });
      } else if (action === "APPROVE_PAYMENT") {
        addToast({
          title: "Payment Approved ⚡",
          description: `Order ${order.referenceCode} approved. Telegram & Email alerts sent!`,
          variant: "info",
        });
      } else if (action === "REJECT_ORDER") {
        addToast({
          title: "Order Rejected ❌",
          description: `Order ${order.referenceCode} has been rejected. Telegram & Email alerts sent!`,
          variant: "warning",
        });
      }

      await fetchAdminData({
        status: statusFilter,
        orderType: typeFilter,
        search: searchQuery,
      });
    } catch (error) {
      addToast({
        title: "Action Failed",
        description:
          error instanceof Error ? error.message : "Could not update order.",
        variant: "error",
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const fiatSymbol = rateConfig?.fiatSymbol || "₦";

  return (
    <div className="min-h-screen bg-[#EEF0F4] text-[#0A0B0E] flex flex-col">
      <Navbar />
      <WalletConnectModal />
      <ToastContainer />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {!isUnlocked || !isAuthorizedAdminWallet ? (
          <div className="max-w-xl w-full mx-auto my-6 sm:my-14 animate-fadeIn">
            <div className="bg-white rounded-[32px] border border-black/[0.08] shadow-2xl p-6 sm:p-10 space-y-7 hive-container-card">
              {/* Top Security Emblem */}
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#0A0B0E] text-[#FFC700] mx-auto flex items-center justify-center shadow-xl border border-[#FFC700]/30">
                  <Shield className="w-8 h-8 stroke-[2.2]" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFF8DB] text-[#B45309] border border-[#FDE68A]">
                    <Lock className="w-3 h-3" />
                    Cryptographic Admin Gate
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-[#0A0B0E] mt-2">
                    Cryptohive Private Treasury Vault
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto mt-1 leading-relaxed">
                    Access is restricted. You must connect a registered Cryptohive Admin wallet to unlock the treasury dashboard and order operations.
                  </p>
                </div>
              </div>

              {/* Status Section based on wallet connection */}
              {!isConnected || !walletAddress ? (
                /* CASE 1: NO WALLET CONNECTED */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-black/5 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-zinc-200 flex items-center justify-center text-zinc-600 shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0A0B0E] block">
                        No Web3 Wallet Connected
                      </span>
                      <span className="text-[11px] text-zinc-500 block">
                        Connect your authorized admin wallet (MetaMask, Phantom, etc.) to proceed.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWalletModalOpen(true)}
                    className="w-full py-4 px-6 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <Wallet className="w-4 h-4 text-[#FFC700]" />
                    <span>Connect Admin Wallet</span>
                  </button>
                </div>
              ) : !isAuthorizedAdminWallet ? (
                /* CASE 2: CONNECTED BUT UNAUTHORIZED */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[#991B1B] font-bold text-xs">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-[#DC2626]" />
                        <span>Unauthorized Wallet Connected</span>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#DC2626] text-white">
                        Access Denied
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-black/5 font-mono text-xs text-[#0A0B0E] break-all select-all flex items-center justify-between gap-2">
                      <span>{walletAddress}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(walletAddress, "unauth_addr")}
                        className="p-1 rounded hover:bg-zinc-100 text-zinc-500"
                        title="Copy address"
                      >
                        {copiedId === "unauth_addr" ? (
                          <Check className="w-3.5 h-3.5 text-[#D97706]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#991B1B] leading-relaxed">
                      This wallet address is not registered on the Cryptohive Admin whitelist. The admin dashboard is cryptographically locked and will not open for this address.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setWalletModalOpen(true)}
                      className="py-3 px-4 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#FFC700]" />
                      <span>Switch Wallet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => disconnectWallet()}
                      className="py-3 px-4 rounded-full bg-zinc-100 hover:bg-zinc-200 text-[#0A0B0E] font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* CASE 3: WHITELISTED ADMIN WALLET CONNECTED -> ENTER PIN TO UNLOCK */
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#FFFDF6] border border-[#FDE68A] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0A0B0E] text-[#FFC700] flex items-center justify-center font-bold text-xs shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309] block">
                          Whitelisted Admin Wallet Verified
                        </span>
                        <span className="font-mono font-extrabold text-xs sm:text-sm text-[#0A0B0E]">
                          {formatAddress(walletAddress)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#FFC700] text-black">
                      Authorized
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#0A0B0E]">
                      Admin Access PIN
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        maxLength={8}
                        autoFocus
                        value={adminPinInput}
                        onChange={(e) => {
                          setAdminPinInput(e.target.value);
                          setAuthError(null);
                        }}
                        placeholder="Enter Vault Gate PIN"
                        className="w-full px-4 py-3.5 rounded-2xl bg-[#F7F8FA] border border-black/10 focus:border-[#0A0B0E] focus:outline-none text-sm font-mono tracking-widest text-[#0A0B0E]"
                      />
                      <KeyRound className="w-4 h-4 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying || !adminPinInput.trim()}
                    className="w-full py-4 px-6 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#FFC700]" />
                        <span>Verifying Security Gate...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4 text-[#FFC700]" />
                        <span>Unlock Admin Dashboard</span>
                        <ArrowRight className="w-4 h-4 text-[#FFC700]" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Security Audit Footer */}
              <div className="pt-2 border-t border-black/5 text-center">
                <span className="text-[10px] text-zinc-400 font-mono">
                  Cryptohive Non-Custodial Zero-Trust Architecture • Whitelisted Wallets Only
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ===============================================================
             AUTHENTICATED VAULT DASHBOARD
             =============================================================== */
          <>
            {/* Cryptohive Split Admin Vault Header Banner (Gold & Obsidian — Zero Green) */}
            <div className="rounded-[24px] sm:rounded-[28px] bg-white border border-black/[0.06] shadow-lg shadow-black/[0.03] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-8 p-5 sm:p-8 flex items-center gap-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#FFC700] flex items-center justify-center text-black shadow-md shrink-0">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-lg sm:text-2xl font-black text-[#0A0B0E]">
                      Cryptohive Private Treasury Vault
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF8DB] text-[#B45309] border border-[#FDE68A]">
                      ● Whitelisted Admin Verified
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                    Control live Buy/Sell exchange spreads, trigger Ethers.js
                    treasury payouts, and monitor Email + Telegram webhooks.
                  </p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-[#0A0B0E] text-[#FFC700] border border-[#FFC700]/30">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC700]" />
                      <span>Whitelisted Admin: {formatAddress(walletAddress)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleLockSession}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 text-[#0A0B0E] text-[11px] font-bold transition-all"
                      title="Lock Admin Session"
                    >
                      <Lock className="w-3 h-3 text-zinc-600" />
                      <span>Lock Vault</span>
                    </button>
                  </div>
                </div>
              </div>

          <div className="lg:col-span-4 bg-[#FFC700] p-5 sm:p-6 flex items-center justify-around">
            <div className="text-center">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-black/70 block">
                Pending Queue
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-[#0A0B0E]">
                {pendingOrdersCount}
              </span>
            </div>
            <div className="h-10 w-px bg-black/15" />
            <div className="text-center">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-black/70 block">
                Unread Alerts
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-[#0A0B0E]">
                {unreadNotificationsCount}
              </span>
            </div>
          </div>
        </div>

        {/* Top Grid: Left = Dynamic Rate Control Card, Right = Gold & Obsidian Multi-Channel Notification Engine */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Rate Management Panel (7 cols) */}
          <div className="lg:col-span-7 rounded-[24px] sm:rounded-[32px] bg-white border border-black/[0.06] shadow-xl shadow-black/[0.03] overflow-hidden">
            <div className="px-5 sm:px-7 py-5 border-b border-zinc-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-[#0A0B0E]" />
                <h2 className="text-sm sm:text-base font-extrabold text-[#0A0B0E]">
                  Dynamic Exchange Rate &amp; Treasury Control
                </h2>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#FFF8DB] text-[#B45309] border border-[#FDE68A] font-bold">
                Active Spread: {formatCurrency(netDeskSpreadFiat, fiatSymbol)}/USDT
              </span>
            </div>

            <form onSubmit={handleSaveRates} className="p-5 sm:p-7 space-y-5">
              {/* Interactive Adjustable Profit Spread Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF6] border border-[#FDE68A] space-y-3 hive-field-card">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#B45309]" />
                    <label className="text-xs font-black uppercase tracking-wider text-[#B45309]">
                      Adjustable Profit Spread (Margin per USDT)
                    </label>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#B45309]">
                    Current Profit: {fiatSymbol}{parseFloat(spreadAmountInput || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}/USDT
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 p-3 rounded-xl bg-white border border-[#FDE68A] flex items-center gap-2 shadow-inner">
                    <span className="text-base font-mono font-black text-[#B45309]">
                      {fiatSymbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={spreadAmountInput}
                      onChange={(e) => handleSpreadChange(e.target.value)}
                      placeholder="e.g. 50.00"
                      className="w-full bg-transparent text-xl sm:text-2xl font-black font-mono text-[#0A0B0E] focus:outline-none"
                    />
                    <span className="text-xs font-mono font-bold text-zinc-400 shrink-0">
                      / USDT
                    </span>
                  </div>

                  {/* Quick Preset Margin Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 mr-0.5">
                      Quick Set:
                    </span>
                    {[25, 35, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleApplyPresetSpread(preset)}
                        className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 ${
                          Math.abs(parseFloat(spreadAmountInput) - preset) < 0.2
                            ? "bg-[#0A0B0E] text-[#FFC700] shadow-sm"
                            : "bg-white border border-[#FDE68A] text-[#B45309] hover:bg-[#FFF8DB]"
                        }`}
                      >
                        {fiatSymbol}{preset}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Adjusting the spread automatically re-balances your <strong>Buy Rate</strong> (+{(parseFloat(spreadAmountInput || "0") / 2).toFixed(2)}) and <strong>Sell Rate</strong> (-{(parseFloat(spreadAmountInput || "0") / 2).toFixed(2)}) around your USD Reference Rate.
                </p>
              </div>

              {/* Three Breakdown Inputs: Buy Rate, Sell Rate, USD Reference Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-black/[0.05]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-extrabold text-[#0A0B0E]">
                      Buy Rate (Fiat → USDT)
                    </label>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {Number(previewBuySpread) >= 0 ? "+" : ""}
                      {previewBuySpread}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base font-mono font-bold text-zinc-400">
                      {fiatSymbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={buyRateInput}
                      onChange={(e) => handleBuyRateChange(e.target.value)}
                      className="w-full bg-transparent text-xl font-black font-mono text-[#0A0B0E] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFFDF6] border border-[#FDE68A]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-extrabold text-[#B45309]">
                      Sell Rate (USDT → Fiat)
                    </label>
                    <span className="text-[10px] font-mono text-zinc-400">
                      -{previewSellSpread}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base font-mono font-bold text-zinc-400">
                      {fiatSymbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={sellRateInput}
                      onChange={(e) => handleSellRateChange(e.target.value)}
                      className="w-full bg-transparent text-xl font-black font-mono text-[#0A0B0E] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-black/[0.05]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-zinc-500">
                      USD Reference Rate
                    </label>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Base Oracle
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-base font-mono font-bold text-zinc-400">
                      {fiatSymbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={usdRefInput}
                      onChange={(e) => handleUsdRefChange(e.target.value)}
                      className="w-full bg-transparent text-xl font-black font-mono text-[#0A0B0E] focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-black/[0.06]">
                {/* 1. Multi-Network Treasury Receiving Wallets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#0A0B0E] flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#FFC700]" />
                        Network-Specific Treasury Receiving Wallets (USDT)
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Designate different receiving wallets for each blockchain network when clients sell USDT.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncEvmToAll}
                      className="px-3 py-1 rounded-full bg-[#FFF8DB] hover:bg-[#FFC700]/30 text-[#92400E] text-[11px] font-extrabold border border-[#FDE68A] transition-colors"
                      title="Sync Ethereum address to BSC, Polygon & Arbitrum"
                    >
                      Copy Ethereum → All EVM Chains
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Ethereum Mainnet (ERC20) */}
                    <div className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-black/[0.06] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#0A0B0E] flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-[#0A0B0E]"></span>
                          Ethereum Mainnet (ERC-20 USDT)
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/5 font-bold">
                          Chain ID: 1
                        </span>
                      </div>
                      <input
                        type="text"
                        value={ethTreasuryInput}
                        onChange={(e) => setEthTreasuryInput(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs font-mono text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                        required
                      />
                    </div>

                    {/* BNB Chain / BSC (BEP20) */}
                    <div className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-black/[0.06] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#0A0B0E] flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-[#F3BA2F]"></span>
                          BNB Chain / BSC (BEP-20 USDT)
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/5 font-bold">
                          Chain ID: 56
                        </span>
                      </div>
                      <input
                        type="text"
                        value={bscTreasuryInput}
                        onChange={(e) => setBscTreasuryInput(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs font-mono text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                        required
                      />
                    </div>

                    {/* Polygon (POL) */}
                    <div className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-black/[0.06] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#0A0B0E] flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-[#8247E5]"></span>
                          Polygon (POL USDT)
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/5 font-bold">
                          Chain ID: 137
                        </span>
                      </div>
                      <input
                        type="text"
                        value={polyTreasuryInput}
                        onChange={(e) => setPolyTreasuryInput(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs font-mono text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                        required
                      />
                    </div>

                    {/* Arbitrum One (ARB) */}
                    <div className="p-3.5 rounded-2xl bg-[#F7F8FA] border border-black/[0.06] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#0A0B0E] flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-[#28A0F0]"></span>
                          Arbitrum One (ARB USDT)
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/5 font-bold">
                          Chain ID: 42161
                        </span>
                      </div>
                      <input
                        type="text"
                        value={arbTreasuryInput}
                        onChange={(e) => setArbTreasuryInput(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-xs font-mono text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                        required
                      />
                    </div>

                    {/* Solana Mainnet (SPL) */}
                    <div className="p-3.5 rounded-2xl bg-[#FFFDF6] border border-[#FDE68A] space-y-1.5 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#92400E] flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-[#9945FF]"></span>
                          Solana Mainnet (SPL USDT)
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#FFC700]/30 text-[#92400E] font-bold">
                          Chain ID: 101 • Base58 Address
                        </span>
                      </div>
                      <input
                        type="text"
                        value={solTreasuryInput}
                        onChange={(e) => setSolTreasuryInput(e.target.value)}
                        placeholder="Base58 Solana Address (e.g. 8kRk2dE6Lg3V41Lp1fomvX62h9p6HjG8QnCj2fM18A2y)"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#FDE68A] text-xs font-mono text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Authorized Admin Login Wallets (Multi-Wallet Whitelist) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF6] border border-[#FDE68A] space-y-3.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#92400E] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#D97706]" />
                        Authorized Admin Login Wallets (Multi-Wallet Whitelist)
                      </h4>
                      <p className="text-[11px] text-[#92400E]/80 mt-0.5">
                        Any wallet address in this whitelist can connect and authenticate with your Admin PIN to unlock this vault.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFC700]/30 text-[#92400E] text-[10px] font-black font-mono">
                      {whitelistedWallets.length} Authorized
                    </span>
                  </div>

                  {/* List of Whitelisted Wallets */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {whitelistedWallets.map((addr) => {
                      const isCurrentSession =
                        walletAddress &&
                        addr.toLowerCase() === walletAddress.toLowerCase();
                      const isSol = isValidSolanaAddress(addr);

                      return (
                        <div
                          key={addr}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-black/5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                isSol
                                  ? "bg-[#FFF8DB] text-[#92400E] border border-[#FDE68A]"
                                  : "bg-[#0A0B0E] text-[#FFC700]"
                              }`}
                            >
                              {isSol ? "SOL" : "EVM"}
                            </span>
                            <span className="font-mono text-[#0A0B0E] font-bold truncate">
                              {addr}
                            </span>
                            {isCurrentSession && (
                              <span className="px-2 py-0.5 rounded-full bg-[#0A0B0E] text-[#FFC700] text-[9px] font-extrabold shrink-0">
                                Current Active
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopy(addr, `admin-${addr}`)}
                              className="p-1 rounded text-zinc-400 hover:text-black"
                              title="Copy Address"
                            >
                              {copiedId === `admin-${addr}` ? (
                                <Check className="w-3.5 h-3.5 text-[#D97706]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(isCurrentSession)}
                              onClick={() => handleRemoveAdminWallet(addr)}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 disabled:opacity-30 disabled:pointer-events-none"
                              title={
                                isCurrentSession
                                  ? "Cannot remove current session"
                                  : "Remove from whitelist"
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add New Whitelisted Admin Wallet Input Bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newAdminWalletInput}
                      onChange={(e) => setNewAdminWalletInput(e.target.value)}
                      placeholder="Paste new EVM (0x...) or Solana (Base58) wallet address..."
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-black/10 text-xs font-mono text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                    />
                    <button
                      type="button"
                      onClick={handleAddAdminWallet}
                      disabled={!newAdminWalletInput.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A0B0E] hover:bg-zinc-800 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#FFC700]" />
                      <span>Add Admin Wallet</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      Corporate Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankNameInput}
                      onChange={(e) => setBankNameInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F8FA] border border-black/10 text-xs text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankAccNumberInput}
                      onChange={(e) => setBankAccNumberInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F8FA] border border-black/10 text-xs font-mono text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={bankAccNameInput}
                      onChange={(e) => setBankAccNameInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F7F8FA] border border-black/10 text-xs text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#D97706]" />
                  Strict Min Limit: ${(rateConfig?.minTradeUsd || 1.0).toFixed(2)} USD (
                  {formatCurrency((rateConfig?.minTradeUsd || 1.0) * parsedBuy, fiatSymbol, 0)})
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFromDb}
                    disabled={isSavingRates}
                    className="flex items-center gap-1.5 px-3.5 py-3 rounded-full bg-zinc-100 hover:bg-zinc-200 text-[#0A0B0E] font-bold text-xs transition-all"
                    title="Reload currently saved database values into form"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Reset to DB</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncLiveMarket}
                    disabled={isSyncingLive || isSavingRates}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-full bg-[#FFF8DB] hover:bg-[#FDE68A] text-[#B45309] font-bold text-xs border border-[#FDE68A] shadow-sm transition-all"
                    title="Fetch real-time live market exchange rate from CoinGecko / Coinbase oracle"
                  >
                    {isSyncingLive ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D97706]" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                    )}
                    <span>⚡ Sync Live Market</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingRates}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    {isSavingRates ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FFC700]" />
                    ) : (
                      <Save className="w-3.5 h-3.5 text-[#FFC700]" />
                    )}
                    <span>Publish Live Rates</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Multi-Channel Notification Engine Feed (5 cols - Gold & Obsidian Card) */}
          <div className="lg:col-span-5 rounded-[24px] sm:rounded-[32px] hive-obsidian-card border border-[#FFC700]/30 shadow-2xl overflow-hidden flex flex-col text-white">
            <div className="px-5 sm:px-6 py-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#FFC700]" />
                <h2 className="text-sm font-extrabold text-white">
                  Multi-Channel Notification Engine
                </h2>
                {unreadNotificationsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FFC700] text-black">
                    {unreadNotificationsCount} new
                  </span>
                )}
              </div>

              {unreadNotificationsCount > 0 && (
                <button
                  onClick={() => markNotificationsRead()}
                  className="text-[11px] text-[#FFC700] hover:underline flex items-center gap-1 font-bold"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark read
                </button>
              )}
            </div>

            <div className="px-5 sm:px-6 py-3 bg-black/40 border-b border-white/10 grid grid-cols-3 gap-2 text-[10px] font-semibold">
              <div className="flex items-center gap-1.5 text-zinc-200">
                <span className="w-2 h-2 rounded-full bg-[#FFC700]" />
                <span>Vault Panel</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-200">
                <Mail className="w-3 h-3 text-[#FFC700]" />
                <span>
                  Email: {channelsConfigured.email ? "Live" : "Ready"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-200">
                <MessageSquare className="w-3 h-3 text-[#FFC700]" />
                <span>
                  Telegram: {channelsConfigured.telegram ? "Live" : "Ready"}
                </span>
              </div>
            </div>

            <div className="divide-y divide-white/10 max-h-[310px] overflow-y-auto">
              {adminNotifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  No order notifications dispatched yet.
                </div>
              ) : (
                adminNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() =>
                      !notif.isRead && markNotificationsRead(notif.id)
                    }
                    className={`p-4 transition-colors cursor-pointer ${
                      notif.isRead
                        ? "bg-transparent opacity-70"
                        : "bg-[#FFC700]/[0.06] hover:bg-[#FFC700]/[0.12]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#FFC700] shrink-0" />
                        )}
                        {notif.title}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] font-mono flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                        {notif.referenceCode}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#FFC700]/20 text-[#FFC700]">
                        Email: {notif.emailStatus}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                        Telegram: {notif.telegramStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* =========================================================================
            MULTI-FIAT RAILS & PERMISSIONS ENGINE
            Admin can toggle Buy/Sell availability per local currency, set custom bank
            accounts per currency, configure oracle reference rates and spreads, and add
            new fiats from the global metadata catalog.
           ========================================================================= */}
        <section className="rounded-[24px] sm:rounded-[32px] bg-white border border-black/10 shadow-xl overflow-hidden hive-field-card">
          {/* Header */}
          <div className="p-5 sm:p-7 border-b border-black/[0.06] bg-[#FAFAFA] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#D97706]" />
                <h3 className="text-base sm:text-lg font-black text-[#0A0B0E]">
                  Multi-Fiat Rails &amp; Currency Permissions
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#0A0B0E] text-[#FFC700] text-[10px] font-black uppercase tracking-wider">
                  {adminChannels.length} Rails Active
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Control trade permissions (Buy / Sell), set corporate bank accounts, and configure profit spreads for each world currency.
              </p>
            </div>

            {/* Actions: Add New Fiat + Save All Channels */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Dropdown to add unlisted fiat */}
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedNewFiatToAdd}
                  onChange={(e) => setSelectedNewFiatToAdd(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white border border-black/10 text-xs font-bold text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                >
                  <option value="">+ Add Currency Channel...</option>
                  {Object.values(GLOBAL_FIAT_METADATA)
                    .filter(
                      (meta) =>
                        !adminChannels.some((c) => c.code === meta.code)
                    )
                    .map((meta) => (
                      <option key={meta.code} value={meta.code}>
                        {meta.flag} {meta.code} - {meta.name} ({meta.symbol})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedNewFiatToAdd}
                  onClick={handleAddNewFiatChannel}
                  className="px-3.5 py-2 rounded-xl bg-[#FFF8DB] hover:bg-[#FDE68A] text-[#92400E] border border-[#FDE68A] font-bold text-xs disabled:opacity-40 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              <button
                type="button"
                disabled={isSavingChannels}
                onClick={handleSaveMultiFiatRails}
                className="px-5 py-2 rounded-xl bg-[#0A0B0E] hover:bg-zinc-800 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                {isSavingChannels ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FFC700]" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-[#FFC700]" />
                )}
                <span>Save All Multi-Fiat Rails</span>
              </button>
            </div>
          </div>

          {/* Channel Cards Grid */}
          <div className="p-5 sm:p-7 space-y-4">
            {adminChannels.map((channel) => {
              const isExpanded = expandedChannelCode === channel.code;
              const hasBank = Boolean(
                channel.bankAccountNumber?.trim() && channel.bankName?.trim()
              );

              return (
                <div
                  key={channel.code}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? "border-[#FFC700] bg-[#FFFDF6] shadow-sm"
                      : "border-black/[0.06] bg-[#F9FAFB] hover:border-black/20"
                  }`}
                >
                  {/* Card Summary Header */}
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-3xl shrink-0 leading-none">
                        {channel.flag || "🌐"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm sm:text-base text-[#0A0B0E]">
                            {channel.code}
                          </span>
                          <span className="text-xs text-zinc-500 font-semibold">
                            {channel.name}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/5 text-[#0A0B0E] font-bold">
                            {channel.symbol}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 flex items-center gap-3 mt-1 flex-wrap font-mono">
                          <span>Ref: {channel.usdReferenceRate} / USD</span>
                          <span>•</span>
                          <span>
                            Buy: {channel.buyRate} {channel.symbol}
                          </span>
                          <span>•</span>
                          <span>
                            Sell: {channel.sellRate} {channel.symbol}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Status Toggles & Expand Arrow */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Buy Toggle Checkbox */}
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-black/10 cursor-pointer select-none hover:bg-zinc-50">
                        <input
                          type="checkbox"
                          checked={channel.buyEnabled}
                          onChange={() => handleToggleBuyChannel(channel.code)}
                          className="rounded text-[#0A0B0E] focus:ring-0 cursor-pointer w-4 h-4"
                        />
                        <span className="text-xs font-bold text-[#0A0B0E] flex items-center gap-1.5">
                          <span>Buy (Fiat→USDT)</span>
                          {channel.buyEnabled ? (
                            hasBank ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                Active
                              </span>
                            ) : (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold"
                                title="Bank account details not yet entered"
                              >
                                Bank Missing
                              </span>
                            )
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-bold">
                              Paused
                            </span>
                          )}
                        </span>
                      </label>

                      {/* Sell Toggle Checkbox */}
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-black/10 cursor-pointer select-none hover:bg-zinc-50">
                        <input
                          type="checkbox"
                          checked={channel.sellEnabled}
                          onChange={() => handleToggleSellChannel(channel.code)}
                          className="rounded text-[#0A0B0E] focus:ring-0 cursor-pointer w-4 h-4"
                        />
                        <span className="text-xs font-bold text-[#0A0B0E] flex items-center gap-1.5">
                          <span>Sell (USDT→Fiat)</span>
                          {channel.sellEnabled ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                              Active
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-bold">
                              Paused
                            </span>
                          )}
                        </span>
                      </label>

                      {/* Expand / Collapse Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedChannelCode(
                            isExpanded ? null : channel.code
                          )
                        }
                        className="p-2 rounded-xl bg-white border border-black/10 hover:bg-zinc-100 text-[#0A0B0E] transition-colors"
                        title={
                          isExpanded
                            ? "Collapse Details"
                            : "Configure Bank Details & Rates"
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {/* Remove Channel Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFiatChannel(channel.code)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        title={`Remove ${channel.code} channel`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Configuration Details */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 border-t border-black/5 bg-white space-y-4 rounded-b-2xl">
                      {/* Rate & Spread Configuration for this fiat */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                            USD Reference Rate (1 USD =)
                          </label>
                          <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#F7F8FA] border border-black/10">
                            <span className="font-bold text-zinc-400">
                              {channel.symbol}
                            </span>
                            <input
                              type="number"
                              step="any"
                              value={channel.usdReferenceRate}
                              onChange={(e) =>
                                handleChannelFieldChange(
                                  channel.code,
                                  "usdReferenceRate",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full bg-transparent font-mono font-bold text-[#0A0B0E] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                            Buy Spread (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={channel.buySpreadPercent}
                            onChange={(e) =>
                              handleChannelFieldChange(
                                channel.code,
                                "buySpreadPercent",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-3 py-2 rounded-xl bg-[#F7F8FA] border border-black/10 font-mono font-bold text-[#0A0B0E] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                            Live Buy Rate (Fiat / USDT)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={channel.buyRate}
                            onChange={(e) =>
                              handleChannelFieldChange(
                                channel.code,
                                "buyRate",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFDF6] border border-[#FDE68A] font-mono font-black text-[#0A0B0E] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                            Live Sell Rate (Fiat / USDT)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={channel.sellRate}
                            onChange={(e) =>
                              handleChannelFieldChange(
                                channel.code,
                                "sellRate",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-3 py-2 rounded-xl bg-[#FFFDF6] border border-[#FDE68A] font-mono font-black text-[#0A0B0E] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Bank Details for receiving this fiat */}
                      <div className="pt-2 border-t border-black/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-[#0A0B0E] flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-[#D97706]" />
                            {channel.code} Corporate Deposit Bank (Clients Pay
                            Into This)
                          </span>
                          {!hasBank && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                              Required for Buy USDT Rails
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                              Bank Name
                            </label>
                            <input
                              type="text"
                              value={channel.bankName}
                              onChange={(e) =>
                                handleChannelFieldChange(
                                  channel.code,
                                  "bankName",
                                  e.target.value
                                )
                              }
                              placeholder="e.g. Providus Bank / Chase / Standard Bank"
                              className="w-full px-3 py-2 rounded-xl bg-[#F7F8FA] border border-black/10 text-xs text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                              Account / IBAN Number
                            </label>
                            <input
                              type="text"
                              value={channel.bankAccountNumber}
                              onChange={(e) =>
                                handleChannelFieldChange(
                                  channel.code,
                                  "bankAccountNumber",
                                  e.target.value
                                )
                              }
                              placeholder="e.g. 0123456789"
                              className="w-full px-3 py-2 rounded-xl bg-[#F7F8FA] border border-black/10 text-xs font-mono text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                              Account Holder Name
                            </label>
                            <input
                              type="text"
                              value={channel.bankAccountName}
                              onChange={(e) =>
                                handleChannelFieldChange(
                                  channel.code,
                                  "bankAccountName",
                                  e.target.value
                                )
                              }
                              placeholder="e.g. CRYPTOHIVE DIGITAL TREASURY"
                              className="w-full px-3 py-2 rounded-xl bg-[#F7F8FA] border border-black/10 text-xs text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                            Routing Instructions / Payment Note (Optional)
                          </label>
                          <input
                            type="text"
                            value={channel.bankRoutingNote}
                            onChange={(e) =>
                              handleChannelFieldChange(
                                channel.code,
                                "bankRoutingNote",
                                e.target.value
                              )
                            }
                            placeholder="e.g. Include Payment Reference code CHV-... in transfer memo"
                            className="w-full px-3 py-2 rounded-xl bg-[#F7F8FA] border border-black/10 text-xs text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Middle Section: Admin Transaction Settlement Queue */}
        <section className="rounded-[24px] sm:rounded-[32px] bg-white border border-black/[0.06] shadow-xl shadow-black/[0.03] overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#0A0B0E] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D97706]" />
                Cryptohive DeFi Transaction Queue
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Verify bank transfers or on-chain USDT deposits and execute
                instant Ethers.js settlement.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Ref, Wallet, TxHash..."
                  className="pl-9 pr-4 py-2 rounded-full bg-[#F7F8FA] border border-black/10 text-xs text-[#0A0B0E] focus:outline-none focus:border-[#0A0B0E] w-full sm:w-56"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3.5 py-2 rounded-full bg-[#F7F8FA] border border-black/10 text-xs font-bold text-[#0A0B0E] focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="BUY">Buy USDT Only</option>
                <option value="SELL">Sell USDT Only</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 rounded-full bg-[#F7F8FA] border border-black/10 text-xs font-bold text-[#0A0B0E] focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="pending_payment">Pending Payment (Buy)</option>
                <option value="pending_fiat_payout">
                  Pending Fiat Payout (Sell)
                </option>
                <option value="payment_confirmed">Payment Confirmed</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {adminOrders.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-400">
              No OTC orders match the active filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-[#F9FAFB]">
                    <th className="py-3.5 px-5 sm:px-6">Order &amp; Time</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Client Wallet</th>
                    <th className="py-3.5 px-4">USDT &amp; Fiat Volume</th>
                    <th className="py-3.5 px-4">Proof &amp; Bank Details</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 sm:px-6 text-right">
                      Settlement Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {adminOrders.map((order) => {
                    const isBuy = order.orderType === "BUY";
                    const isPending = [
                      "pending_payment",
                      "pending_fiat_payout",
                      "payment_confirmed",
                    ].includes(order.status);
                    const isBusy = processingOrderId === order.id;
                    const net =
                      SUPPORTED_NETWORKS[order.networkChainId] ||
                      SUPPORTED_NETWORKS[1];

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-[#F9FAFB] transition-colors"
                      >
                        <td className="py-4 px-5 sm:px-6">
                          <div className="font-mono font-bold text-[#0A0B0E]">
                            {order.referenceCode}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {new Date(order.createdAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                          {order.adminNotes?.includes("Refreshed") ? (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#FFF8DB] text-[#92400E] border border-[#FDE68A]">
                              🔄 15m Refreshed
                            </span>
                          ) : order.adminNotes?.includes("PRICE_LOCKED_AT") ? (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#FFC700]/25 text-[#92400E]">
                              🔒 15m Locked
                            </span>
                          ) : null}
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap ${
                              isBuy
                                ? "bg-[#0A0B0E] text-[#FFC700]"
                                : "bg-[#FFF8DB] text-[#B45309] border border-[#FDE68A]"
                            }`}
                          >
                            {isBuy ? "BUY (Fiat→USDT)" : "SELL (USDT→Fiat)"}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-mono">
                          <div className="flex items-center gap-1.5 text-[#0A0B0E] font-semibold">
                            <span>{formatAddress(order.receivingWallet)}</span>
                            <button
                              onClick={() =>
                                handleCopy(
                                  order.receivingWallet,
                                  `w-${order.id}`
                                )
                              }
                              className="text-zinc-400 hover:text-black"
                            >
                              {copiedId === `w-${order.id}` ? (
                                <Check className="w-3 h-3 text-[#D97706]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-sans">
                            {order.networkName}
                          </div>
                        </td>

                        <td className="py-4 px-4 font-mono">
                          <div className="font-extrabold text-[#0A0B0E]">
                            {order.usdtAmount.toFixed(2)} USDT
                          </div>
                          <div className="text-[#B45309] font-bold text-[11px]">
                            {formatCurrency(order.fiatAmount, order.fiatSymbol)}{" "}
                            <span className="text-zinc-400 font-normal">
                              (@
                              {formatCurrency(
                                order.exchangeRateApplied,
                                order.fiatSymbol,
                                0
                              )}
                              )
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {isBuy ? (
                            <div className="space-y-0.5">
                              <div className="text-[11px] font-mono font-semibold text-[#B45309]">
                                Ref: {order.paymentReference || "N/A"}
                              </div>
                              <div className="text-[10px] text-zinc-500">
                                Sender: {order.senderAccountName || "N/A"}
                              </div>
                              {order.treasuryPayoutTxHash && (
                                <a
                                  href={`${net.explorerUrl}/tx/${order.treasuryPayoutTxHash}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-mono text-[#D97706] hover:underline font-bold"
                                >
                                  Payout Tx:{" "}
                                  {order.treasuryPayoutTxHash.slice(0, 10)}...
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#0A0B0E]">
                                <span>
                                  Tx:{" "}
                                  {order.cryptoDepositTxHash?.slice(0, 12)}...
                                </span>
                                {order.cryptoDepositTxHash && (
                                  <a
                                    href={`${net.explorerUrl}/tx/${order.cryptoDepositTxHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#D97706] hover:underline"
                                    title="Verify On-Chain Deposit"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-600 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-zinc-400" />
                                {order.userBankName} • {order.userAccountNumber}{" "}
                                ({order.userAccountName})
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <StatusBadge status={order.status} />
                        </td>

                        <td className="py-4 px-5 sm:px-6 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-2">
                              {order.status !== "payment_confirmed" && (
                                <button
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleOrderAction(order, "APPROVE_PAYMENT")
                                  }
                                  className="px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-[#0A0B0E] text-[11px] font-bold transition-colors"
                                >
                                  Approve
                                </button>
                              )}

                              {isBuy ? (
                                <button
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleOrderAction(
                                      order,
                                      "CONFIRM_AND_CREDIT"
                                    )
                                  }
                                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FFC700] hover:bg-[#ffcf26] text-black font-extrabold text-[11px] shadow-md transition-all whitespace-nowrap"
                                >
                                  {isBusy ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                  <span>Confirm &amp; Credit</span>
                                </button>
                              ) : (
                                <button
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleOrderAction(order, "MARK_COMPLETED")
                                  }
                                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0A0B0E] hover:bg-zinc-800 text-white font-bold text-[11px] shadow-md transition-all whitespace-nowrap"
                                >
                                  {isBusy ? (
                                    <RefreshCw className="w-3 h-3 animate-spin text-[#FFC700]" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3 text-[#FFC700]" />
                                  )}
                                  <span>Mark Completed</span>
                                </button>
                              )}

                              <button
                                disabled={isBusy}
                                onClick={() =>
                                  handleOrderAction(order, "REJECT_ORDER")
                                }
                                className="p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                                title="Reject Order"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono font-bold text-zinc-400">
                              {order.status === "completed"
                                ? "Settled ✓"
                                : "Closed"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Bottom Section: Live Chronological Audit Logs */}
        <section className="rounded-[24px] sm:rounded-[32px] bg-white border border-black/[0.06] shadow-xl shadow-black/[0.03] overflow-hidden">
          <div className="px-5 sm:px-7 py-5 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-[#0A0B0E]" />
              <h2 className="text-sm sm:text-base font-extrabold text-[#0A0B0E]">
                Live Security &amp; Settlement Audit Logs
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              {auditLogs.length} Events
            </span>
          </div>

          <div className="divide-y divide-zinc-100 max-h-[340px] overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="px-5 sm:px-7 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-[#F9FAFB] text-xs"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-extrabold shrink-0 mt-0.5 ${
                      log.actorType === "ADMIN"
                        ? "bg-[#FFC700] text-black"
                        : log.actorType === "USER"
                        ? "bg-[#0A0B0E] text-[#FFC700]"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {log.actorType}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[#0A0B0E]">
                        {log.action}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        by {formatAddress(log.actorAddress)}
                      </span>
                    </div>
                    <p className="text-zinc-600 mt-0.5 leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      </>
    )}
  </main>
    </div>
  );
}
