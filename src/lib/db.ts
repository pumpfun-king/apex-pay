import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || "file:./dev.db",
      },
    },
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const DEFAULT_CONFIG_FALLBACK = {
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
  bankName: "Providus Corporate Treasury",
  bankAccountNumber: "9948201948",
  bankAccountName: "CRYPTOHIVE DIGITAL TREASURY LTD",
  bankRoutingNote:
    "Include your exact Cryptohive Order Reference ID in the transfer narration/memo.",
  updatedBy: "SYSTEM_BOOTSTRAP",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export async function ensureSystemConfig() {
  try {
    let config = await prisma.rateConfiguration.findUnique({
      where: { id: "default_config" },
    });

    if (!config) {
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
          bankName: "Providus Corporate Treasury",
          bankAccountNumber: "9948201948",
          bankAccountName: "CRYPTOHIVE DIGITAL TREASURY LTD",
          bankRoutingNote:
            "Include your exact Cryptohive Order Reference ID in the transfer narration/memo.",
          updatedBy: "SYSTEM_BOOTSTRAP",
        },
      });

      try {
        await prisma.auditLog.create({
          data: {
            action: "SYSTEM_INITIALIZED",
            actorType: "SYSTEM",
            actorAddress:
              process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS ||
              "0x05179071c4a8298239bC1db971284EbbC450409D",
            details:
              "Initialized Cryptohive DeFi Rate Engine (Non-Custodial Non-Simulated Web3 Treasury).",
          },
        });
      } catch {
        // Ignore audit log error on initial boot
      }
    } else {
      if (config.bankAccountName.includes("APEXPAY")) {
        config = await prisma.rateConfiguration.update({
          where: { id: "default_config" },
          data: {
            bankAccountName: "CRYPTOHIVE DIGITAL TREASURY LTD",
            bankRoutingNote:
              "Include your exact Cryptohive Order Reference ID in the transfer narration/memo.",
          },
        });
      }

      // Migrate any legacy APX- order reference prefixes to CHV-
      try {
        const legacyOrders = await prisma.otcOrder.findMany({
          where: { referenceCode: { startsWith: "APX-" } },
        });
        for (const ord of legacyOrders) {
          await prisma.otcOrder.update({
            where: { id: ord.id },
            data: {
              referenceCode: ord.referenceCode.replace(/^APX-/, "CHV-"),
            },
          });
        }
      } catch {
        // Ignore migration error
      }
    }

    return config;
  } catch (err) {
    console.warn("ensureSystemConfig warning, using fallback configuration:", err);
    return DEFAULT_CONFIG_FALLBACK as any;
  }
}
