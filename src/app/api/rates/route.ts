import { NextRequest, NextResponse } from "next/server";
import { ensureSystemConfig, prisma } from "@/lib/db";
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

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    let config = await ensureSystemConfig();
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
        config = await prisma.rateConfiguration.update({
          where: { id: "default_config" },
          data: {
            usdReferenceRate: marketRate,
            buyRate: newBuyRate,
            sellRate: newSellRate,
            updatedBy: `AUTOTRACK:SPREAD_${safeSpread.toFixed(2)}`,
          },
        });
      }
    }

    const networkTreasuryWallets = parseNetworkTreasuryWallets(
      config.treasuryWallet
    );
    const whitelistedAdminWallets = getAdminWhitelistedWallets(
      config.bankRoutingNote
    );

    return NextResponse.json({
      success: true,
      config,
      liveMarket,
      isAutoTracking: !isManualFixed,
      networkTreasuryWallets,
      whitelistedAdminWallets,
    });
  } catch (error) {
    console.error("Failed to fetch rate config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve live exchange rates.",
      },
      { status: 500 }
    );
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

    const updated = await prisma.rateConfiguration.update({
      where: { id: "default_config" },
      data: {
        fiatCurrency: body.fiatCurrency || currentConfig.fiatCurrency,
        fiatSymbol: body.fiatSymbol || currentConfig.fiatSymbol,
        usdReferenceRate: refRate,
        buyRate,
        sellRate,
        buySpreadPercent,
        sellSpreadPercent,
        minTradeUsd,
        maxTradeUsd,
        treasuryWallet: finalTreasuryWallet,
        bankName: body.bankName || currentConfig.bankName,
        bankAccountNumber: body.bankAccountNumber || currentConfig.bankAccountNumber,
        bankAccountName: body.bankAccountName || currentConfig.bankAccountName,
        bankRoutingNote: finalBankRoutingNote,
        updatedBy:
          body.autoTrackMarket === false
            ? "MANUAL_FIXED"
            : `AUTOTRACK:SPREAD_${(buyRate - sellRate > 0 ? buyRate - sellRate : 37.5).toFixed(2)}`,
      },
    });

    const networkTreasuryWallets = parseNetworkTreasuryWallets(
      updated.treasuryWallet
    );
    const whitelistedAdminWallets = getAdminWhitelistedWallets(
      updated.bankRoutingNote
    );

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

    return NextResponse.json({
      success: true,
      config: updated,
      networkTreasuryWallets,
      whitelistedAdminWallets,
    });
  } catch (error) {
    console.error("Failed to update rate config:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update exchange rates.",
      },
      { status: 500 }
    );
  }
}
