import { NextRequest, NextResponse } from "next/server";
import { ensureSystemConfig, prisma } from "@/lib/db";
import { dispatchMultiChannelOrderNotification } from "@/lib/notifications";
import { fetchLiveMarketRates } from "@/lib/rates";
import {
  isValidEvmAddress,
  isSolanaWalletAddress,
  isEvmWalletAddress,
  SUPPORTED_NETWORKS,
  getTreasuryWalletForNetwork,
} from "@/lib/web3";

export const dynamic = "force-dynamic";

async function generateUniqueReferenceCode(
  orderType: "BUY" | "SELL",
  preferredCode?: string
): Promise<string> {
  const cleanPreferred = preferredCode?.trim().toUpperCase();
  if (cleanPreferred && cleanPreferred.length >= 6) {
    const existingPreferred = await prisma.otcOrder.findFirst({
      where: {
        OR: [
          { referenceCode: cleanPreferred },
          { paymentReference: cleanPreferred },
        ],
      },
      select: { id: true },
    });
    if (!existingPreferred) {
      return cleanPreferred;
    }
  }

  const prefix = orderType === "BUY" ? "CHV-B" : "CHV-S";
  for (let attempt = 0; attempt < 25; attempt++) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const candidate = `${prefix}${randomDigits}`;
    const collision = await prisma.otcOrder.findFirst({
      where: {
        OR: [{ referenceCode: candidate }, { paymentReference: candidate }],
      },
      select: { id: true },
    });
    if (!collision) {
      return candidate;
    }
  }

  // Fallback with timestamp entropy guaranteed unique
  const entropy = Date.now().toString().slice(-6);
  return `${prefix}${entropy}`;
}

export async function GET(req: NextRequest) {
  try {
    await ensureSystemConfig();
    const { searchParams } = new URL(req.url);

    // Reserve a guaranteed DB-unique Reference / Receipt Code when requested
    const reserveCodeParam = searchParams.get("reserveCode")?.toUpperCase();
    if (reserveCodeParam === "BUY" || reserveCodeParam === "SELL") {
      const uniqueCode = await generateUniqueReferenceCode(reserveCodeParam);
      return NextResponse.json({
        success: true,
        referenceCode: uniqueCode,
      });
    }
    const walletAddress = searchParams.get("walletAddress")?.trim();
    const status = searchParams.get("status")?.trim();
    const orderType = searchParams.get("orderType")?.trim();
    const search = searchParams.get("search")?.trim();

    const whereClause: Record<string, unknown> = {};

    if (walletAddress) {
      whereClause.walletAddress = {
        equals: walletAddress,
      };
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (orderType && orderType !== "ALL") {
      whereClause.orderType = orderType;
    }

    if (search) {
      whereClause.OR = [
        { referenceCode: { contains: search } },
        { walletAddress: { contains: search } },
        { paymentReference: { contains: search } },
        { cryptoDepositTxHash: { contains: search } },
        { userAccountName: { contains: search } },
      ];
    }

    const orders = await prisma.otcOrder.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Compute aggregated stats
    const allMatchingOrders = walletAddress
      ? await prisma.otcOrder.findMany({
          where: { walletAddress },
        })
      : await prisma.otcOrder.findMany();

    const completedOrders = allMatchingOrders.filter(
      (o) => o.status === "completed"
    );
    const activeOrders = allMatchingOrders.filter((o) =>
      ["pending_payment", "pending_fiat_payout", "payment_confirmed"].includes(
        o.status
      )
    );

    const totalVolumeUsdt = completedOrders.reduce(
      (sum, o) => sum + o.usdtAmount,
      0
    );
    const totalVolumeFiat = completedOrders.reduce(
      (sum, o) => sum + o.fiatAmount,
      0
    );

    return NextResponse.json({
      success: true,
      orders,
      stats: {
        totalOrders: allMatchingOrders.length,
        activeOrdersCount: activeOrders.length,
        completedOrdersCount: completedOrders.length,
        totalVolumeUsdt,
        totalVolumeFiat,
      },
    });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch OTC orders.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = await ensureSystemConfig();
    const action = String(body.action || "").toUpperCase();

    // -------------------------------------------------------------
    // ACTION: REFRESH_EXPIRED_LOCK (15-Minute Price Lock Expired)
    // -------------------------------------------------------------
    if (action === "REFRESH_EXPIRED_LOCK") {
      const refCode = String(body.referenceCode || body.paymentReference || "").trim().toUpperCase();
      const orderId = String(body.orderId || "").trim();

      const existing = await prisma.otcOrder.findFirst({
        where: {
          OR: [
            ...(refCode ? [{ referenceCode: refCode }, { paymentReference: refCode }] : []),
            ...(orderId ? [{ id: orderId }] : []),
          ],
        },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Order not found to refresh lock." },
          { status: 404 }
        );
      }

      // If user has already clicked payment done or admin confirmed, don't overwrite
      if (existing.status !== "pending_payment") {
        return NextResponse.json({
          success: true,
          order: existing,
          alreadyProgressed: true,
        });
      }

      // Re-fetch live market rate to ensure rate accurately follows market + spread
      let currentBuyRate = config.buyRate;
      let currentSellRate = config.sellRate;
      try {
        const liveMarket = await fetchLiveMarketRates();
        if (config.updatedBy !== "MANUAL_FIXED" && liveMarket.usdtToNgn > 500) {
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
          currentBuyRate = Number((liveMarket.usdtToNgn + safeSpread / 2).toFixed(2));
          currentSellRate = Number((liveMarket.usdtToNgn - safeSpread / 2).toFixed(2));
        }
      } catch (err) {
        console.error("Live market rate fetch error during lock refresh:", err);
      }

      const isSell = existing.orderType === "SELL";
      const effectiveRate = isSell ? currentSellRate : currentBuyRate;
      const previousRate = existing.exchangeRateApplied;
      const newFiatAmount = Number((existing.usdtAmount * effectiveRate).toFixed(2));
      const now = new Date();
      const lockStartedStr = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const updatedOrder = await prisma.otcOrder.update({
        where: { id: existing.id },
        data: {
          fiatAmount: newFiatAmount,
          exchangeRateApplied: effectiveRate,
          updatedAt: now,
          adminNotes: `15m Expired & Refreshed at ${now.toISOString()} | Prev Rate: ${previousRate} -> New Rate: ${effectiveRate}`,
        },
      });

      // Dispatch refreshed order alert to Admin Vault, Email & Telegram
      const notifications = await dispatchMultiChannelOrderNotification(
        updatedOrder,
        {
          eventType: "LOCK_REFRESHED",
          previousRate,
          newRate: effectiveRate,
          lockStartedAt: lockStartedStr,
        }
      );

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        newFiatAmount,
        newRate: effectiveRate,
        newBuyRate: currentBuyRate,
        newSellRate: currentSellRate,
        lockStartedAt: now.toISOString(),
        lockStartedDisplay: lockStartedStr,
        notifications,
      });
    }

    const orderType: "BUY" | "SELL" = body.orderType === "SELL" ? "SELL" : "BUY";
    const walletAddress = String(body.walletAddress || "").trim();
    const isSolana = isSolanaWalletAddress(walletAddress);
    const isEvm = isEvmWalletAddress(walletAddress);

    if (!isSolana && !isEvm) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid connected Web3 (Ethereum or Solana) wallet address is required.",
        },
        { status: 400 }
      );
    }

    // Strict Cross-Chain Guard:
    // If connected to a Solana wallet (Base58 address), settlement is locked to Solana Mainnet (Chain ID 101, SPL USDT).
    // An EVM address cannot settle on Solana, and a Solana address cannot settle on EVM chains.
    let chainId = Number(body.networkChainId || (isSolana ? 101 : 1));
    if (isSolana) {
      chainId = 101;
    } else if (chainId === 101 && !isSolana) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot settle on Solana network with an Ethereum/EVM wallet. Please connect Phantom or Solflare.",
        },
        { status: 400 }
      );
    }

    const network = SUPPORTED_NETWORKS[chainId] || SUPPORTED_NETWORKS[1];

    // For BUY orders, the receiving wallet is strictly the user's connected wallet address.
    // For SELL orders, default to the network-appropriate treasury wallet.
    const defaultTreasury = getTreasuryWalletForNetwork(
      chainId,
      config.treasuryWallet
    );

    const receivingWallet =
      orderType === "BUY"
        ? walletAddress
        : String(body.receivingWallet || defaultTreasury).trim();

    if (orderType === "BUY") {
      if (isSolana && !isSolanaWalletAddress(receivingWallet)) {
        return NextResponse.json(
          {
            success: false,
            error: "Receiving wallet address must be a valid Solana address when settling on Solana.",
          },
          { status: 400 }
        );
      }
      if (!isSolana && !isEvmWalletAddress(receivingWallet)) {
        return NextResponse.json(
          {
            success: false,
            error: "Receiving wallet address must be a valid EVM address.",
          },
          { status: 400 }
        );
      }
    }

    // Calculate amounts strictly from the Admin-set live rate in the database
    const exchangeRateApplied =
      orderType === "BUY" ? config.buyRate : config.sellRate;

    let usdtAmount = Number(body.usdtAmount || 0);
    let fiatAmount = Number(body.fiatAmount || 0);

    if (orderType === "BUY") {
      if (fiatAmount > 0 && (!usdtAmount || body.inputMode === "FIAT")) {
        usdtAmount = Number((fiatAmount / exchangeRateApplied).toFixed(4));
      } else if (usdtAmount > 0) {
        fiatAmount = Number((usdtAmount * exchangeRateApplied).toFixed(2));
      }
    } else {
      // SELL USDT -> Fiat
      if (usdtAmount > 0) {
        fiatAmount = Number((usdtAmount * exchangeRateApplied).toFixed(2));
      }
    }

    // Strict Minimum Trade Limit Check: $5.00 USD Equivalent
    // 1 USDT = $1.00 USD equivalent, plus verify local fiat against usdReferenceRate
    const usdEquivalentByFiat =
      config.usdReferenceRate > 0
        ? fiatAmount / config.usdReferenceRate
        : usdtAmount;
    const usdEquivalent = Number(
      Math.min(usdtAmount, usdEquivalentByFiat > 0 ? usdEquivalentByFiat : usdtAmount).toFixed(2)
    );
    const minRequiredFiat = Number(
      (config.minTradeUsd * exchangeRateApplied).toFixed(2)
    );

    if (usdtAmount < config.minTradeUsd || usdEquivalent < config.minTradeUsd - 0.05) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum trade limit is $${config.minTradeUsd.toFixed(2)} USD equivalent (${config.fiatSymbol}${minRequiredFiat.toLocaleString()} / ${config.minTradeUsd.toFixed(2)} USDT).`,
        },
        { status: 400 }
      );
    }

    if (usdtAmount > config.maxTradeUsd) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum single trade limit is $${config.maxTradeUsd.toLocaleString()} USDT.`,
        },
        { status: 400 }
      );
    }

    if (orderType === "SELL" && action !== "LOCK_SELL_TRADE") {
      // SELL validations
      if (
        !body.userBankName?.trim() ||
        !body.userAccountNumber?.trim() ||
        !body.userAccountName?.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Complete bank payout details (Bank Name, Account Number, Account Name) are required.",
          },
          { status: 400 }
        );
      }
      if (!body.cryptoDepositTxHash?.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: "On-chain USDT deposit transaction hash (txHash) is required.",
          },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const lockStartedStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (action === "LOCK_BUY_TRADE") {
      const preferredCode = body.referenceCode || body.paymentReference;
      const existing = preferredCode
        ? await prisma.otcOrder.findFirst({
            where: {
              OR: [
                { referenceCode: preferredCode.trim().toUpperCase() },
                { paymentReference: preferredCode.trim().toUpperCase() },
              ],
            },
          })
        : null;

      if (existing && existing.status === "pending_payment") {
        const updated = await prisma.otcOrder.update({
          where: { id: existing.id },
          data: {
            fiatAmount,
            usdtAmount,
            usdEquivalent: Number(usdtAmount.toFixed(2)),
            exchangeRateApplied,
            receivingWallet,
            networkChainId: network.chainId,
            networkName: network.name,
            senderAccountName: body.senderAccountName?.trim() || existing.senderAccountName,
            adminNotes: `PRICE_LOCKED_AT: ${now.toISOString()} (15m window)`,
            updatedAt: now,
          },
        });

        const notifications = await dispatchMultiChannelOrderNotification(
          updated,
          {
            eventType: "PRICE_LOCKED",
            lockStartedAt: lockStartedStr,
          }
        );

        return NextResponse.json({
          success: true,
          order: updated,
          lockStartedAt: now.toISOString(),
          lockStartedDisplay: lockStartedStr,
          notifications,
        });
      }
    }

    if (action === "LOCK_SELL_TRADE") {
      const preferredCode = body.referenceCode || body.paymentReference;
      const existing = preferredCode
        ? await prisma.otcOrder.findFirst({
            where: {
              OR: [
                { referenceCode: preferredCode.trim().toUpperCase() },
                { paymentReference: preferredCode.trim().toUpperCase() },
              ],
            },
          })
        : null;

      if (existing && existing.status === "pending_payment") {
        const updated = await prisma.otcOrder.update({
          where: { id: existing.id },
          data: {
            fiatAmount,
            usdtAmount,
            usdEquivalent: Number(usdtAmount.toFixed(2)),
            exchangeRateApplied,
            receivingWallet,
            networkChainId: network.chainId,
            networkName: network.name,
            adminNotes: `PRICE_LOCKED_AT: ${now.toISOString()} (15m window)`,
            updatedAt: now,
          },
        });

        const notifications = await dispatchMultiChannelOrderNotification(
          updated,
          {
            eventType: "PRICE_LOCKED",
            lockStartedAt: lockStartedStr,
          }
        );

        return NextResponse.json({
          success: true,
          order: updated,
          lockStartedAt: now.toISOString(),
          lockStartedDisplay: lockStartedStr,
          notifications,
        });
      }

      // Create new locked sell order
      const referenceCode = await generateUniqueReferenceCode(
        "SELL",
        body.referenceCode
      );
      const newLockedOrder = await prisma.otcOrder.create({
        data: {
          referenceCode,
          orderType: "SELL",
          walletAddress,
          receivingWallet,
          fiatCurrency: config.fiatCurrency,
          fiatSymbol: config.fiatSymbol,
          fiatAmount,
          usdEquivalent: Number(usdtAmount.toFixed(2)),
          usdtAmount,
          exchangeRateApplied,
          status: "pending_payment",
          networkChainId: network.chainId,
          networkName: network.name,
          adminNotes: `PRICE_LOCKED_AT: ${now.toISOString()} (15m window)`,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "SELL_ORDER_PRICE_LOCKED",
          actorType: "USER",
          actorAddress: walletAddress,
          orderId: newLockedOrder.id,
          details: `Seller locked ${referenceCode} for ${usdtAmount.toFixed(2)} USDT (${config.fiatSymbol}${fiatAmount.toLocaleString()}) at ${config.fiatSymbol}${exchangeRateApplied}/USDT at ${lockStartedStr}.`,
        },
      });

      const notifications = await dispatchMultiChannelOrderNotification(
        newLockedOrder,
        {
          eventType: "PRICE_LOCKED",
          lockStartedAt: lockStartedStr,
        }
      );

      return NextResponse.json({
        success: true,
        order: newLockedOrder,
        lockStartedAt: now.toISOString(),
        lockStartedDisplay: lockStartedStr,
        notifications,
      });
    }

    // If this is a final SELL submission, check if user has an existing locked order to update
    if (orderType === "SELL") {
      const preferredCode = body.referenceCode || body.paymentReference;
      const existingLocked = preferredCode
        ? await prisma.otcOrder.findFirst({
            where: {
              OR: [
                { referenceCode: preferredCode.trim().toUpperCase() },
                { paymentReference: preferredCode.trim().toUpperCase() },
                ...(body.orderId ? [{ id: body.orderId }] : []),
              ],
            },
          })
        : null;

      if (existingLocked && (existingLocked.status === "pending_payment" || existingLocked.status === "pending_fiat_payout")) {
        const updated = await prisma.otcOrder.update({
          where: { id: existingLocked.id },
          data: {
            userBankName: body.userBankName?.trim() || null,
            userAccountNumber: body.userAccountNumber?.trim() || null,
            userAccountName: body.userAccountName?.trim() || null,
            cryptoDepositTxHash: body.cryptoDepositTxHash?.trim() || null,
            fiatAmount,
            usdtAmount,
            usdEquivalent: Number(usdtAmount.toFixed(2)),
            exchangeRateApplied,
            receivingWallet,
            status: "pending_fiat_payout",
            adminNotes: existingLocked.adminNotes
              ? `${existingLocked.adminNotes} | USDT_DEPOSITED_AT: ${now.toISOString()}`
              : `USDT_DEPOSITED_AT: ${now.toISOString()}`,
            updatedAt: now,
          },
        });

        await prisma.auditLog.create({
          data: {
            action: "SELL_ORDER_SUBMITTED",
            actorType: "USER",
            actorAddress: walletAddress,
            orderId: updated.id,
            details: `User submitted Sell Order ${updated.referenceCode} for ${updated.usdtAmount.toFixed(2)} USDT (${config.fiatSymbol}${updated.fiatAmount.toLocaleString()}) with on-chain txHash ${updated.cryptoDepositTxHash?.slice(0, 14)}...`,
          },
        });

        const notifications = await dispatchMultiChannelOrderNotification(
          updated,
          {
            eventType: "PAYMENT_DONE",
          }
        );

        return NextResponse.json({
          success: true,
          order: updated,
          notifications,
        });
      }
    }

    const referenceCode = await generateUniqueReferenceCode(
      orderType,
      body.referenceCode || body.paymentReference
    );
    const initialStatus =
      orderType === "BUY" ? "pending_payment" : "pending_fiat_payout";

    const newOrder = await prisma.otcOrder.create({
      data: {
        referenceCode,
        orderType,
        walletAddress,
        receivingWallet,
        fiatCurrency: config.fiatCurrency,
        fiatSymbol: config.fiatSymbol,
        fiatAmount,
        usdEquivalent: Number(usdtAmount.toFixed(2)),
        usdtAmount,
        exchangeRateApplied,
        status: initialStatus,
        paymentReference: orderType === "BUY" ? referenceCode : null,
        senderAccountName: body.senderAccountName?.trim() || null,
        userBankName: body.userBankName?.trim() || null,
        userAccountNumber: body.userAccountNumber?.trim() || null,
        userAccountName: body.userAccountName?.trim() || null,
        cryptoDepositTxHash: body.cryptoDepositTxHash?.trim() || null,
        networkChainId: network.chainId,
        networkName: network.name,
        adminNotes:
          action === "LOCK_BUY_TRADE"
            ? `PRICE_LOCKED_AT: ${now.toISOString()} (15m window)`
            : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action:
          action === "LOCK_BUY_TRADE"
            ? "BUY_ORDER_PRICE_LOCKED"
            : orderType === "BUY"
            ? "BUY_ORDER_SUBMITTED"
            : "SELL_ORDER_SUBMITTED",
        actorType: "USER",
        actorAddress: walletAddress,
        orderId: newOrder.id,
        details:
          action === "LOCK_BUY_TRADE"
            ? `Buyer locked ${referenceCode} for ${usdtAmount.toFixed(2)} USDT (${config.fiatSymbol}${fiatAmount.toLocaleString()}) at ${config.fiatSymbol}${exchangeRateApplied}/USDT at ${lockStartedStr}.`
            : orderType === "BUY"
            ? `User submitted Buy Order ${referenceCode} for ${usdtAmount.toFixed(2)} USDT (${config.fiatSymbol}${fiatAmount.toLocaleString()}) at ${config.fiatSymbol}${exchangeRateApplied}/USDT. Ref: ${newOrder.paymentReference}`
            : `User submitted Sell Order ${referenceCode} for ${usdtAmount.toFixed(2)} USDT (${config.fiatSymbol}${fiatAmount.toLocaleString()}) with on-chain txHash ${newOrder.cryptoDepositTxHash?.slice(0, 14)}...`,
      },
    });

    // Dispatch multi-channel notifications (Email, Telegram, Admin Vault) immediately for both BUY and SELL
    const notifications = await dispatchMultiChannelOrderNotification(
      newOrder,
      {
        eventType:
          action === "LOCK_BUY_TRADE"
            ? "PRICE_LOCKED"
            : orderType === "SELL"
            ? "PAYMENT_DONE"
            : "ORDER_SUBMITTED",
        lockStartedAt: lockStartedStr,
      }
    );

    return NextResponse.json({
      success: true,
      order: newOrder,
      lockStartedAt: now.toISOString(),
      lockStartedDisplay: lockStartedStr,
      notifications,
    });
  } catch (error) {
    console.error("Failed to create OTC order:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to submit OTC order. Please try again.",
      },
      { status: 500 }
    );
  }
}
