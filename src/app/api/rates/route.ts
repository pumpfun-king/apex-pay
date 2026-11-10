import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  ensureSystemConfig,
  prisma,
  DEFAULT_CONFIG_FALLBACK,
  getInMemoryConfig,
  setInMemoryConfig,
} from "@/lib/db";
import {
  isValidEvmAddress,
  isAdminWalletAddress,
  parseNetworkTreasuryWallets,
  getAdminWhitelistedWallets,
  isValidCryptoAddress,
  isEvmWalletAddress,
  isValidSolanaAddress,
} from "@/lib/web3";
import { fetchLiveMarketRates } from "@/lib/rates";
import { parseFiatChannels, extractBankRoutingMemo } from "@/lib/fiatChannels";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const inMem = getInMemoryConfig();
    let config = inMem || (await ensureSystemConfig());
    const liveMarket = await fetchLiveMarketRates();

    // Live Oracle Auto-Tracking Engine:
    // Unless the admin explicitly set updatedBy to "MANUAL_FIXED", the engine dynamically
    // adjusts the platform exchange rates with live market movements while strictly locking
    // in the admin's chosen profit spread so the desk never incurs a loss from currency volatility.
    const isManualFixed = config.updatedBy === "MANUAL_FIXED";
    if (!isManualFixed && liveMarket.usdtToNgn > 500) {
      const marketRate = liveMarket.usdtToNgn;

      // Extract target spread in fiat (from updatedBy tag or active buy/sell difference)
      let targetSpread = config.buyRate - config.sellRate;
      if (config.updatedBy?.startsWith("AUTOTRACK:SPREAD_")) {
        const parsedSpread = parseFloat(
          config.updatedBy.replace("AUTOTRACK:SPREAD_", "")
        );
        if (!isNaN(parsedSpread) && parsedSpread > 0) {
          targetSpread = parsedSpread;
        }
      }

      const safeSpread = Math.max(
        15.0,
        !isNaN(targetSpread) && targetSpread > 0 ? targetSpread : 37.5
      );
      const halfSpread = safeSpread / 2;
      const newBuyRate = Number((marketRate + halfSpread).toFixed(2));
      const newSellRate = Number((marketRate - halfSpread).toFixed(2));

      // Re-align if market moved or if reference rate differs
      const rateDiff = Math.abs(marketRate - config.usdReferenceRate);
      if (rateDiff >= 0.2 || Math.abs(config.buyRate - newBuyRate) >= 0.2) {
        config = {
          ...config,
          usdReferenceRate: marketRate,
          buyRate: newBuyRate,
          sellRate: newSellRate,
          updatedBy: "AUTOTRACK:SPREAD_" + safeSpread.toFixed(2),
        };
        try {
          await prisma.rateConfiguration.update({
            where: { id: "default_config" },
            data: {
              usdReferenceRate: marketRate,
              buyRate: newBuyRate,
              sellRate: newSellRate,
              updatedBy: "AUTOTRACK:SPREAD_" + safeSpread.toFixed(2),
            },
          });
        } catch {
          // Fallback in-memory update
        }
      }
    }

    const networkTreasuryWallets = parseNetworkTreasuryWallets(
      config.treasuryWallet
    );
    const whitelistedAdminWallets = getAdminWhitelistedWallets(
      config.bankRoutingNote
    );

    let channelsJson = (config as any)?.fiatChannelsJson;
    if (!channelsJson || channelsJson === "[]") {
      try {
        const tmpPath = path.join("/tmp", "fiatChannels.json");
        if (fs.existsSync(tmpPath)) {
          channelsJson = fs.readFileSync(tmpPath, "utf8");
        }
      } catch {
        // Ignore
      }
    }
    const rawChannels = parseFiatChannels(channelsJson);
    const fiatChannels = rawChannels.map((ch) => {
      const bankName = ch.bankName?.trim() || "";
      const bankAccountNumber = ch.bankAccountNumber?.trim() || "";
      const bankAccountName = ch.bankAccountName?.trim() || "";
      const hasBank = Boolean(bankName && bankAccountNumber);

      return {
        ...ch,
        bankName,
        bankAccountNumber,
        bankAccountName,
        bankRoutingNote: extractBankRoutingMemo(ch.bankRoutingNote),
        buyEnabled: hasBank ? (ch.buyEnabled ?? true) : false,
        sellEnabled: ch.sellEnabled ?? true,
      };
    });

    return NextResponse.json({
      success: true,
      config,
      fiatChannels,
      liveMarket,
      isAutoTracking: !isManualFixed,
      networkTreasuryWallets,
      whitelistedAdminWallets,
    });
  } catch (error) {
    console.warn("Using fallback rate config:", error);
    const fallbackRawChannels = parseFiatChannels((DEFAULT_CONFIG_FALLBACK as any)?.fiatChannelsJson);
    const fallbackFiatChannels = fallbackRawChannels.map((ch) => {
      const bankName = ch.bankName?.trim() || "";
      const bankAccountNumber = ch.bankAccountNumber?.trim() || "";
      const bankAccountName = ch.bankAccountName?.trim() || "";
      const hasBank = Boolean(bankName && bankAccountNumber);

      return {
        ...ch,
        bankName,
        bankAccountNumber,
        bankAccountName,
        bankRoutingNote: extractBankRoutingMemo(ch.bankRoutingNote),
        buyEnabled: hasBank ? (ch.buyEnabled ?? true) : false,
        sellEnabled: ch.sellEnabled ?? true,
      };
    });

    return NextResponse.json({
      success: true,
      config: DEFAULT_CONFIG_FALLBACK,
      fiatChannels: fallbackFiatChannels,
      liveMarket: {
        source: "Cryptohive Baseline Oracle",
        usdToNgn: DEFAULT_CONFIG_FALLBACK.usdReferenceRate,
        usdtToNgn: DEFAULT_CONFIG_FALLBACK.usdReferenceRate,
        usdtToUsd: 1.0,
        timestamp: new Date().toISOString(),
      },
      isAutoTracking: true,
      networkTreasuryWallets: parseNetworkTreasuryWallets(
        DEFAULT_CONFIG_FALLBACK.treasuryWallet
      ),
      whitelistedAdminWallets: getAdminWhitelistedWallets(
        DEFAULT_CONFIG_FALLBACK.bankRoutingNote
      ),
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const currentConfig = await ensureSystemConfig();
    const adminAddress =
      body.adminAddress ||
      req.headers.get("x-admin-wallet") ||
      req.nextUrl.searchParams.get("adminWallet");

    if (!isAdminWalletAddress(adminAddress, currentConfig.bankRoutingNote)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Wallet address is not an authorized Cryptohive Admin.",
        },
        { status: 403 }
      );
    }

    let buyRate = Number(body.buyRate ?? currentConfig.buyRate);
    let sellRate = Number(body.sellRate ?? currentConfig.sellRate);
    let usdReferenceRate = Number(
      body.usdReferenceRate ?? currentConfig.usdReferenceRate
    );

    // If Admin clicked "Sync with Live Market Oracle"
    if (body.syncLiveMarket) {
      const live = await fetchLiveMarketRates();
      usdReferenceRate = live.usdtToNgn;
      const buySpread = Number(body.buySpreadPercent ?? currentConfig.buySpreadPercent ?? 1.85);
      const sellSpread = Number(body.sellSpreadPercent ?? currentConfig.sellSpreadPercent ?? 0.93);
      buyRate = Number((usdReferenceRate * (1 + buySpread / 100)).toFixed(2));
      sellRate = Number((usdReferenceRate * (1 - sellSpread / 100)).toFixed(2));
    }

    const minTradeUsd = Math.max(1.0, Number(body.minTradeUsd ?? currentConfig.minTradeUsd));
    const maxTradeUsd = Number(body.maxTradeUsd ?? currentConfig.maxTradeUsd);

    if (isNaN(buyRate) || buyRate <= 0 || isNaN(sellRate) || sellRate <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Buy Rate and Sell Rate must be valid positive numbers.",
        },
        { status: 400 }
      );
    }

    let finalTreasuryWallet = currentConfig.treasuryWallet;

    if (body.networkTreasuryWallets && typeof body.networkTreasuryWallets === "object") {
      const validatedMap: Record<number, string> = {
        ...parseNetworkTreasuryWallets(currentConfig.treasuryWallet),
      };

      for (const [key, addr] of Object.entries(body.networkTreasuryWallets)) {
        const cId = Number(key);
        if (typeof addr === "string" && addr.trim()) {
          const cleanAddr = addr.trim();
          if (cId === 101) {
            if (!isValidSolanaAddress(cleanAddr)) {
              return NextResponse.json(
                {
                  success: false,
                  error: `Invalid Solana receiving wallet address: ${cleanAddr}`,
                },
                { status: 400 }
              );
            }
          } else {
            if (!isEvmWalletAddress(cleanAddr)) {
              return NextResponse.json(
                {
                  success: false,
                  error: `Invalid EVM receiving wallet address for Chain ID ${cId}: ${cleanAddr}`,
                },
                { status: 400 }
              );
            }
          }
          validatedMap[cId] = cleanAddr;
        }
      }
      finalTreasuryWallet = JSON.stringify(validatedMap);
    } else if (body.treasuryWallet) {
      const trimmed = String(body.treasuryWallet).trim();
      if (trimmed.startsWith("{")) {
        try {
          JSON.parse(trimmed);
          finalTreasuryWallet = trimmed;
        } catch {
          return NextResponse.json(
            { success: false, error: "Invalid JSON format for treasury wallets." },
            { status: 400 }
          );
        }
      } else if (!isValidCryptoAddress(trimmed)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid Treasury Wallet address.",
          },
          { status: 400 }
        );
      } else {
        finalTreasuryWallet = trimmed;
      }
    }

    let finalBankRoutingNote = body.bankRoutingNote || currentConfig.bankRoutingNote;
    if (Array.isArray(body.adminWallets)) {
      const validAdminWallets = body.adminWallets
        .map((a: unknown) => String(a).trim())
        .filter((a: string) => isValidCryptoAddress(a));

      let existingNote = currentConfig.bankRoutingNote;
      try {
        if (existingNote.startsWith("{")) {
          const parsed = JSON.parse(existingNote);
          existingNote = parsed.note || "";
        }
      } catch {
        // Fallback
      }

      finalBankRoutingNote = JSON.stringify({
        adminWallets: Array.from(new Set(validAdminWallets)),
        note: body.bankRoutingNote || existingNote,
      });
    }

    // Calculate markup spreads relative to USD reference rate
    const refRate = usdReferenceRate > 0 ? usdReferenceRate : 1;
    const buySpreadPercent = Number(
      (((buyRate - refRate) / refRate) * 100).toFixed(2)
    );
    const sellSpreadPercent = Number(
      (((refRate - sellRate) / refRate) * 100).toFixed(2)
    );

    const resolvedPrimaryCode = body.fiatCurrency || currentConfig.fiatCurrency || "NGN";

    let finalFiatChannels = body.fiatChannels;
    if (Array.isArray(finalFiatChannels) && finalFiatChannels.length > 0) {
      finalFiatChannels = finalFiatChannels.map((c: any) => {
        const bankName = c.bankName?.trim() || "";
        const bankAccountNumber = c.bankAccountNumber?.trim() || "";
        const bankAccountName = c.bankAccountName?.trim() || "";
        const hasBank = Boolean(bankName && bankAccountNumber);
        return {
          ...c,
          bankName,
          bankAccountNumber,
          bankAccountName,
          bankRoutingNote: extractBankRoutingMemo(c.bankRoutingNote),
          buyEnabled: hasBank ? (c.buyEnabled ?? true) : false,
          sellEnabled: c.sellEnabled ?? true,
        };
      });
    }

    const firstChannelWithBank = Array.isArray(finalFiatChannels)
      ? finalFiatChannels.find((c: any) => c.bankName && c.bankAccountNumber)
      : null;
    const resolvedBankName =
      firstChannelWithBank?.bankName || (body.bankName ?? currentConfig.bankName ?? "");
    const resolvedBankAccountNumber =
      firstChannelWithBank?.bankAccountNumber || (body.bankAccountNumber ?? currentConfig.bankAccountNumber ?? "");
    const resolvedBankAccountName =
      firstChannelWithBank?.bankAccountName || (body.bankAccountName ?? currentConfig.bankAccountName ?? "");

    let configData = {
      fiatCurrency: resolvedPrimaryCode,
      fiatSymbol: body.fiatSymbol || currentConfig.fiatSymbol || "₦",
      usdReferenceRate: refRate,
      buyRate,
      sellRate,
      buySpreadPercent,
      sellSpreadPercent,
      minTradeUsd,
      maxTradeUsd,
      treasuryWallet: finalTreasuryWallet,
      bankName: resolvedBankName,
      bankAccountNumber: resolvedBankAccountNumber,
      bankAccountName: resolvedBankAccountName,
      bankRoutingNote: finalBankRoutingNote,
      fiatChannelsJson: finalFiatChannels
        ? JSON.stringify(finalFiatChannels)
        : (currentConfig as any)?.fiatChannelsJson,
      updatedBy:
        body.autoTrackMarket === false
          ? "MANUAL_FIXED"
          : `AUTOTRACK:SPREAD_${(buyRate - sellRate > 0 ? buyRate - sellRate : 37.5).toFixed(2)}`,
    };

    let updated: any;
    try {
      updated = await prisma.rateConfiguration.upsert({
        where: { id: "default_config" },
        update: configData,
        create: {
          id: "default_config",
          ...configData,
        },
      });
    } catch (dbErr) {
      console.warn("Database rate update failed, persisting to in-memory config:", dbErr);
      updated = {
        id: "default_config",
        ...configData,
        updatedAt: new Date().toISOString(),
      };
    }

    setInMemoryConfig(updated);

    if (finalFiatChannels && Array.isArray(finalFiatChannels)) {
      try {
        const tmpPath = path.join("/tmp", "fiatChannels.json");
        fs.writeFileSync(tmpPath, JSON.stringify(finalFiatChannels), "utf8");
      } catch {
        // Ignore write failure
      }
    }

    const networkTreasuryWallets = parseNetworkTreasuryWallets(
      updated.treasuryWallet
    );
    const whitelistedAdminWallets = getAdminWhitelistedWallets(
      updated.bankRoutingNote
    );

    try {
      await prisma.auditLog.create({
        data: {
          action: "ADMIN_RATE_UPDATED",
          actorType: "ADMIN",
          actorAddress: body.adminAddress || "ADMIN_DESK",
          details: `Updated OTC Rates — Buy: ${updated.fiatSymbol}${updated.buyRate.toLocaleString()}/USDT (${buySpreadPercent >= 0 ? "+" : ""}${buySpreadPercent}%), Sell: ${updated.fiatSymbol}${updated.sellRate.toLocaleString()}/USDT (Spread: ${sellSpreadPercent}%).`,
          metadataJson: JSON.stringify({
            previousBuyRate: currentConfig.buyRate,
            newBuyRate: updated.buyRate,
            previousSellRate: currentConfig.sellRate,
            newSellRate: updated.sellRate,
          }),
        },
      });
    } catch {
      // Ignore audit log failure in serverless environment
    }

    const fiatChannels = finalFiatChannels || parseFiatChannels(updated.fiatChannelsJson);

    return NextResponse.json({
      success: true,
      config: updated,
      fiatChannels,
      networkTreasuryWallets,
      whitelistedAdminWallets,
    });
  } catch (error) {
    console.error("Failed to update rate config:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update exchange rates.",
      },
      { status: 500 }
    );
  }
}
