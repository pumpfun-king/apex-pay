export interface FiatChannel {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  usdReferenceRate: number;
  buyRate: number;
  sellRate: number;
  buySpreadPercent: number;
  sellSpreadPercent: number;
  buyEnabled: boolean;
  sellEnabled: boolean;
  minTradeUsd: number;
  maxTradeUsd: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankRoutingNote: string;
  updatedAt?: string;
}

export interface GlobalFiatMeta {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  defaultRate: number;
}

export const GLOBAL_FIAT_METADATA: Record<string, GlobalFiatMeta> = {
  NGN: { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", defaultRate: 1620.0 },
  KES: { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪", defaultRate: 129.5 },
  GHS: { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", flag: "🇬🇭", defaultRate: 15.6 },
  ZAR: { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", defaultRate: 18.2 },
  EGP: { code: "EGP", name: "Egyptian Pound", symbol: "E£", flag: "🇪🇬", defaultRate: 49.3 },
  USD: { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", defaultRate: 1.0 },
  EUR: { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", defaultRate: 0.92 },
  GBP: { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", defaultRate: 0.79 },
  CAD: { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦", defaultRate: 1.39 },
  AED: { code: "AED", name: "UAE Dirham", symbol: "AED", flag: "🇦🇪", defaultRate: 3.67 },
  INR: { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", defaultRate: 84.4 },
  BRL: { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷", defaultRate: 5.75 },
  PHP: { code: "PHP", name: "Philippine Peso", symbol: "₱", flag: "🇵🇭", defaultRate: 58.7 },
  UGX: { code: "UGX", name: "Ugandan Shilling", symbol: "USh", flag: "🇺🇬", defaultRate: 3670.0 },
  TZS: { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", flag: "🇹🇿", defaultRate: 2650.0 },
  RWF: { code: "RWF", name: "Rwandan Franc", symbol: "RF", flag: "🇷🇼", defaultRate: 1370.0 },
  XOF: { code: "XOF", name: "West African CFA", symbol: "CFA", flag: "🇸🇳", defaultRate: 615.0 },
  XAF: { code: "XAF", name: "Central African CFA", symbol: "FCFA", flag: "🇨🇲", defaultRate: 615.0 },
};

export const DEFAULT_INITIAL_FIAT_CHANNELS: FiatChannel[] = [
  {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    flag: "🇳🇬",
    usdReferenceRate: 1620.0,
    buyRate: 1650.0,
    sellRate: 1605.0,
    buySpreadPercent: 1.85,
    sellSpreadPercent: 0.93,
    buyEnabled: true,
    sellEnabled: true,
    minTradeUsd: 1.0,
    maxTradeUsd: 50000.0,
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankRoutingNote: "",
  },
  {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    flag: "🇰🇪",
    usdReferenceRate: 129.5,
    buyRate: 131.8,
    sellRate: 127.5,
    buySpreadPercent: 1.8,
    sellSpreadPercent: 1.5,
    buyEnabled: true,
    sellEnabled: true,
    minTradeUsd: 1.0,
    maxTradeUsd: 50000.0,
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankRoutingNote: "",
  },
  {
    code: "GHS",
    name: "Ghanaian Cedi",
    symbol: "GH₵",
    flag: "🇬🇭",
    usdReferenceRate: 15.6,
    buyRate: 15.9,
    sellRate: 15.3,
    buySpreadPercent: 2.0,
    sellSpreadPercent: 1.9,
    buyEnabled: true,
    sellEnabled: true,
    minTradeUsd: 1.0,
    maxTradeUsd: 50000.0,
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankRoutingNote: "",
  },
  {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    flag: "🇿🇦",
    usdReferenceRate: 18.2,
    buyRate: 18.5,
    sellRate: 17.8,
    buySpreadPercent: 1.6,
    sellSpreadPercent: 1.6,
    buyEnabled: true,
    sellEnabled: true,
    minTradeUsd: 1.0,
    maxTradeUsd: 50000.0,
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankRoutingNote: "",
  },
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    flag: "🇺🇸",
    usdReferenceRate: 1.0,
    buyRate: 1.015,
    sellRate: 0.985,
    buySpreadPercent: 1.5,
    sellSpreadPercent: 1.5,
    buyEnabled: true,
    sellEnabled: true,
    minTradeUsd: 1.0,
    maxTradeUsd: 50000.0,
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankRoutingNote: "",
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    flag: "🇪🇺",
    usdReferenceRate: 0.92,
    buyRate: 0.935,
    sellRate: 0.905,
    buySpreadPercent: 1.6,
    sellSpreadPercent: 1.6,
    buyEnabled: true,
    sellEnabled: true,
    minTradeUsd: 1.0,
    maxTradeUsd: 50000.0,
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankRoutingNote: "",
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    flag: "🇬🇧",
    usdReferenceRate: 0.79,
    buyRate: 0.805,
    sellRate: 0.775,
    buySpreadPercent: 1.6,
    sellSpreadPercent: 1.6,
    buyEnabled: true,
    sellEnabled: true,
    minTradeUsd: 1.0,
    maxTradeUsd: 50000.0,
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankRoutingNote: "",
  },
];

export function parseFiatChannels(rawJson?: string | null): FiatChannel[] {
  if (!rawJson || typeof rawJson !== "string") {
    return [...DEFAULT_INITIAL_FIAT_CHANNELS];
  }
  try {
    const parsed = JSON.parse(rawJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge with metadata in case fields are missing
      return parsed.map((item) => {
        const meta = GLOBAL_FIAT_METADATA[item.code] || {
          code: item.code,
          name: item.name || item.code,
          symbol: item.symbol || item.code,
          flag: item.flag || "🌐",
          defaultRate: item.usdReferenceRate || 1.0,
        };
        return {
          code: item.code || meta.code,
          name: item.name || meta.name,
          symbol: item.symbol || meta.symbol,
          flag: item.flag || meta.flag,
          usdReferenceRate: Number(item.usdReferenceRate || meta.defaultRate),
          buyRate: Number(item.buyRate || meta.defaultRate * 1.018),
          sellRate: Number(item.sellRate || meta.defaultRate * 0.982),
          buySpreadPercent: Number(item.buySpreadPercent || 1.8),
          sellSpreadPercent: Number(item.sellSpreadPercent || 1.5),
          buyEnabled: Boolean(item.buyEnabled),
          sellEnabled: Boolean(item.sellEnabled),
          minTradeUsd: Number(item.minTradeUsd || 1.0),
          maxTradeUsd: Number(item.maxTradeUsd || 50000.0),
          bankName: item.bankName || "",
          bankAccountNumber: item.bankAccountNumber || "",
          bankAccountName: item.bankAccountName || "",
          bankRoutingNote: item.bankRoutingNote || "",
          updatedAt: item.updatedAt || new Date().toISOString(),
        };
      });
    }
  } catch {
    // Return fallback on JSON error
  }
  return [...DEFAULT_INITIAL_FIAT_CHANNELS];
}

export function isBuyChannelPermitted(channel?: FiatChannel | null): {
  permitted: boolean;
  reason?: string;
} {
  if (!channel) {
    return {
      permitted: false,
      reason: "Currency channel is not listed.",
    };
  }

  const hasBankDetails = Boolean(
    channel.bankAccountNumber?.trim() && channel.bankName?.trim()
  );

  // If corporate bank details have not been set by admin, block with clear notification
  if (!hasBankDetails) {
    return {
      permitted: false,
      reason: `Deposit account details for ${channel.code} (${channel.name}) are not yet configured in the treasury database.`,
    };
  }

  // If bank details exist, but buy permission is explicitly toggled off by admin
  if (channel.buyEnabled === false) {
    return {
      permitted: false,
      reason: `Buying USDT with ${channel.code} is currently paused by the treasury administrator.`,
    };
  }

  return { permitted: true };
}

export function isSellChannelPermitted(channel?: FiatChannel | null): {
  permitted: boolean;
  reason?: string;
} {
  if (!channel) {
    return {
      permitted: false,
      reason: "Currency channel is not listed.",
    };
  }

  if (!channel.sellEnabled) {
    return {
      permitted: false,
      reason: `Selling USDT to receive ${channel.code} (${channel.name}) is currently paused or disabled by the treasury administrator.`,
    };
  }

  return { permitted: true };
}

/**
 * Extracts only the human-readable customer transfer instructions / memo note,
 * stripping out any internal JSON config (such as adminWallets whitelist).
 */
export function extractBankRoutingMemo(rawNote?: string | null): string {
  if (!rawNote || typeof rawNote !== "string") return "";
  const trimmed = rawNote.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed?.note === "string") {
        return parsed.note.trim();
      }
      return "";
    } catch {
      return "";
    }
  }
  return trimmed;
}
