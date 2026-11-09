import { ethers } from "ethers";

export const ERC20_USDT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

export interface SupportedNetwork {
  chainId: number;
  hexChainId: string;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  explorerUrl: string;
  usdtAddress: string;
  usdtDecimals: number;
}

export const SUPPORTED_NETWORKS: Record<number, SupportedNetwork> = {
  1: {
    chainId: 1,
    hexChainId: "0x1",
    name: "Ethereum",
    shortName: "ETH",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    usdtAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    usdtDecimals: 6,
  },
  56: {
    chainId: 56,
    hexChainId: "0x38",
    name: "BNB Chain",
    shortName: "BSC",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    usdtAddress: "0x55d398326f99059fF775485246999027B3197955",
    usdtDecimals: 18,
  },
  137: {
    chainId: 137,
    hexChainId: "0x89",
    name: "Polygon",
    shortName: "POL",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    usdtAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    usdtDecimals: 6,
  },
  42161: {
    chainId: 42161,
    hexChainId: "0xa4b1",
    name: "Arbitrum",
    shortName: "ARB",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    usdtAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    usdtDecimals: 6,
  },
  101: {
    chainId: 101,
    hexChainId: "0x65",
    name: "Solana",
    shortName: "SOL",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    rpcUrl: "https://api.mainnet-beta.solana.com",
    explorerUrl: "https://solscan.io",
    usdtAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    usdtDecimals: 6,
  },
  11155111: {
    chainId: 11155111,
    hexChainId: "0xaa36a7",
    name: "Sepolia",
    shortName: "SEP",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    rpcUrl: "https://rpc.sepolia.org",
    explorerUrl: "https://sepolia.etherscan.io",
    usdtAddress: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    usdtDecimals: 6,
  },
};

export function formatAddress(address: string | null | undefined): string {
  if (!address) return "";
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  const clean = address.trim();
  if (clean.startsWith("0x")) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean);
}

export function isSolanaWalletAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return isValidSolanaAddress(address);
}

export function isEvmWalletAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  const clean = address.trim();
  return clean.startsWith("0x") && ethers.isAddress(clean);
}

export function isValidEvmAddress(address: string): boolean {
  try {
    return ethers.isAddress(address) || isValidSolanaAddress(address);
  } catch {
    return false;
  }
}

export function isValidCryptoAddress(address: string, chainId?: number): boolean {
  if (!address || typeof address !== "string") return false;
  const clean = address.trim();
  if (chainId === 101) {
    return isValidSolanaAddress(clean);
  }
  return ethers.isAddress(clean) || isValidSolanaAddress(clean);
}

export const DEFAULT_NETWORK_TREASURY_WALLETS: Record<number, string> = {
  1:
    process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS ||
    "0x05179071c4a8298239bC1db971284EbbC450409D", // Ethereum Mainnet (ERC20)
  56:
    process.env.NEXT_PUBLIC_BSC_TREASURY_WALLET_ADDRESS ||
    "0x05179071c4a8298239bC1db971284EbbC450409D", // BNB Chain (BEP20)
  137:
    process.env.NEXT_PUBLIC_POLYGON_TREASURY_WALLET_ADDRESS ||
    "0x05179071c4a8298239bC1db971284EbbC450409D", // Polygon (POL USDT)
  42161:
    process.env.NEXT_PUBLIC_ARBITRUM_TREASURY_WALLET_ADDRESS ||
    "0x05179071c4a8298239bC1db971284EbbC450409D", // Arbitrum (ARB USDT)
  101:
    process.env.NEXT_PUBLIC_SOLANA_TREASURY_WALLET_ADDRESS ||
    "8kRk2dE6Lg3V41Lp1fomvX62h9p6HjG8QnCj2fM18A2y", // Solana (SPL USDT)
};

export function parseNetworkTreasuryWallets(
  rawTreasuryConfig?: string | null
): Record<number, string> {
  const result: Record<number, string> = { ...DEFAULT_NETWORK_TREASURY_WALLETS };
  if (!rawTreasuryConfig) return result;

  const trimmed = rawTreasuryConfig.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      for (const [key, val] of Object.entries(parsed)) {
        const chainId = Number(key);
        if (!isNaN(chainId) && typeof val === "string" && val.trim()) {
          result[chainId] = val.trim();
        }
      }
    } catch {
      // Fallback
    }
  } else if (isValidEvmAddress(trimmed)) {
    result[1] = trimmed;
    result[56] = trimmed;
    result[137] = trimmed;
    result[42161] = trimmed;
  }
  return result;
}

export function getTreasuryWalletForNetwork(
  chainId: number,
  rawTreasuryConfig?: string | null
): string {
  const wallets = parseNetworkTreasuryWallets(rawTreasuryConfig);
  return wallets[chainId] || wallets[1] || DEFAULT_NETWORK_TREASURY_WALLETS[1];
}

export function getAdminWhitelistedWallets(customConfig?: string | null): string[] {
  const envWallets = process.env.NEXT_PUBLIC_ADMIN_WALLETS || "";
  const treasuryEvm =
    process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS ||
    "0x05179071c4a8298239bC1db971284EbbC450409D";
  const treasurySol =
    process.env.NEXT_PUBLIC_SOLANA_TREASURY_WALLET_ADDRESS ||
    "8kRk2dE6Lg3V41Lp1fomvX62h9p6HjG8QnCj2fM18A2y";

  const defaults = [
    treasuryEvm,
    treasurySol,
    "0x05179071c4a8298239bC1db971284EbbC450409D",
    "0x68D3c1Fa48AcE0019E1B6382e8DE589E18fEaB45",
    "ECpJtUf1mjaXkE5VegLHQwHT3pBHHwZupzcdLQAFRfsM",
    "8kRk2dE6Lg3V41Lp1fomvX62h9p6HjG8QnCj2fM18A2y",
  ];

  // Include any extra whitelisted admin wallets configured in database
  const customWallets: string[] = [];
  if (customConfig && typeof customConfig === "string") {
    const trimmed = customConfig.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed.adminWallets)) {
          customWallets.push(...parsed.adminWallets);
        }
      } catch {
        // Fallback
      }
    } else if (trimmed.includes(",")) {
      customWallets.push(...trimmed.split(",").map((s) => s.trim()));
    } else if (isValidCryptoAddress(trimmed)) {
      customWallets.push(trimmed);
    }
  }

  const parsedEnv = envWallets
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

  const combined = [...defaults, ...customWallets, ...parsedEnv];
  return Array.from(new Set(combined.map((w) => w.trim()))).filter(Boolean);
}

export function isAdminWalletAddress(
  address: string | null | undefined,
  customConfig?: string | null
): boolean {
  if (!address || typeof address !== "string") return false;
  const clean = address.trim();
  if (!clean) return false;

  const whitelisted = getAdminWhitelistedWallets(customConfig);
  return whitelisted.some((w) => {
    if (clean.toLowerCase() === w.toLowerCase()) return true;
    if (clean === w) return true;
    return false;
  });
}

export function formatCurrency(amount: number, symbol = "₦", decimals = 2): string {
  return `${symbol}${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatUsdt(amount: number): string {
  return `${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} USDT`;
}

export function parseWeb3Error(error: unknown): string {
  if (!error) return "Unknown Web3 transaction error occurred.";
  const err = error as {
    code?: string | number;
    reason?: string;
    shortMessage?: string;
    message?: string;
  };

  if (
    err.message?.toLowerCase().includes("solana account") ||
    err.message?.toLowerCase().includes("compatible recovery phrase")
  ) {
    return "Phantom is currently in Solana mode. Select 'Phantom (Solana)' in the Cryptohive wallet modal, or switch your active Phantom account to Ethereum.";
  }

  if (
    err.code === "ACTION_REJECTED" ||
    err.code === 4001 ||
    err.message?.toLowerCase().includes("user rejected") ||
    err.message?.toLowerCase().includes("user denied")
  ) {
    return "Transaction signature was rejected in your Web3 wallet.";
  }

  if (
    err.code === "INSUFFICIENT_FUNDS" ||
    err.message?.toLowerCase().includes("insufficient funds") ||
    err.message?.toLowerCase().includes("exceeds balance")
  ) {
    return "Insufficient USDT or native gas balance in your connected wallet.";
  }

  if (err.code === "NETWORK_ERROR" || err.message?.toLowerCase().includes("network")) {
    return "Network connection lost or unsupported chain selected. Please check your wallet network.";
  }

  return err.shortMessage || err.reason || err.message || "Web3 operation failed.";
}
