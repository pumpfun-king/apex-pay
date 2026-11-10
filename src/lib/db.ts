import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Ensure SQLite database file is located in writable /tmp directory in serverless environments (Vercel / Lambda)
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("dev.db")) {
    return process.env.DATABASE_URL;
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      const tmpDbPath = path.join("/tmp", "dev.db");
      if (!fs.existsSync(tmpDbPath)) {
        const potentialSources = [
          path.join(process.cwd(), "prisma", "dev.db"),
          path.join(process.cwd(), "dev.db"),
        ];
        for (const src of potentialSources) {
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, tmpDbPath);
            break;
          }
        }
      }
      return `file:${tmpDbPath}`;
    } catch (err) {
      console.warn("Could not setup SQLite in /tmp:", err);
    }
  }

  return process.env.DATABASE_URL || "file:./prisma/dev.db";
}

const activeDbUrl = resolveDatabaseUrl();
process.env.DATABASE_URL = activeDbUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  inMemoryConfig: any | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: activeDbUrl,
      },
    },
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const DEFAULT_CONFIG_FALLBACK = {
  id: "default_config",
  fiatCurrency: "NGN",
  fiatSymbol: "₦",
  usdReferenceRate: 1620.0,
  buyRate: 1650.0,
  sellRate: 1605.0,
  buySpreadPercent: 1.85,
  sellSpreadPercent: 0.93,
  minTradeUsd: 1.0,
  maxTradeUsd: 50000.0,
  treasuryWallet:
    process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS ||
    "0x05179071c4a8298239bC1db971284EbbC450409D",
  bankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
  bankRoutingNote: "",
  fiatChannelsJson: null as string | null,
  updatedBy: "SYSTEM_BOOTSTRAP",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function getInMemoryConfig() {
  return globalForPrisma.inMemoryConfig || null;
}

export function setInMemoryConfig(config: any) {
  globalForPrisma.inMemoryConfig = { ...config };
}

export async function ensureSystemConfig() {
  // If in-memory updated config exists, return it immediately
  const memoryConfig = getInMemoryConfig();
  if (memoryConfig) {
    return memoryConfig;
  }

  try {
    let config = await prisma.rateConfiguration.findUnique({
      where: { id: "default_config" },
    });

    if (!config) {
      try {
        config = await prisma.rateConfiguration.create({
          data: {
            id: "default_config",
            fiatCurrency: "NGN",
            fiatSymbol: "₦",
            usdReferenceRate: 1620.0,
            buyRate: 1650.0,
            sellRate: 1605.0,
            buySpreadPercent: 1.85,
            sellSpreadPercent: 0.93,
            minTradeUsd: 1.0,
            maxTradeUsd: 50000.0,
            treasuryWallet:
              process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS ||
              "0x05179071c4a8298239bC1db971284EbbC450409D",
            bankName: "",
            bankAccountNumber: "",
            bankAccountName: "",
            bankRoutingNote: "",
            fiatChannelsJson: null,
            updatedBy: "SYSTEM_BOOTSTRAP",
          },
        });
      } catch {
        // Fallback if create fails
        config = DEFAULT_CONFIG_FALLBACK as any;
      }
    } else {
      if (config.bankAccountName?.includes("APEXPAY")) {
        try {
          config = await prisma.rateConfiguration.update({
            where: { id: "default_config" },
            data: {
              bankAccountName: "",
              bankRoutingNote: "",
            },
          });
        } catch {
          // Ignore
        }
      }
    }

    setInMemoryConfig(config);
    return config;
  } catch (err) {
    console.warn("ensureSystemConfig warning, using fallback configuration:", err);
    return DEFAULT_CONFIG_FALLBACK as any;
  }
}
