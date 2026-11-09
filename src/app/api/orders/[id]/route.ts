import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeTreasuryPayout } from "@/lib/treasury";
import { dispatchMultiChannelOrderNotification } from "@/lib/notifications";
import { isAdminWalletAddress } from "@/lib/web3";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await req.json();
    const action = String(body.action || "").toUpperCase();
    const adminAddress = String(body.adminAddress || "ADMIN_TREASURY_DESK");
    const adminNotes = body.adminNotes ? String(body.adminNotes).trim() : undefined;

    const existingOrder = await prisma.otcOrder.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found.",
        },
        { status: 404 }
      );
    }

    if (action === "USER_PAYMENT_DONE") {
      // User clicked "Payment Done" -> Update order to payment_confirmed and dispatch Email, Telegram & Admin Vault alerts
      const updatedOrder = await prisma.otcOrder.update({
        where: { id: existingOrder.id },
        data: {
          status: "payment_confirmed",
          adminNotes: existingOrder.adminNotes
            ? `${existingOrder.adminNotes} | PAYMENT_DONE_AT: ${new Date().toISOString()}`
            : `PAYMENT_DONE_AT: ${new Date().toISOString()}`,
        },
      });

      const notifications = await dispatchMultiChannelOrderNotification(
        updatedOrder,
        {
          eventType: "PAYMENT_DONE",
        }
      );

      await prisma.auditLog.create({
        data: {
          action: "USER_PAYMENT_DONE_CONFIRMED",
          actorType: "USER",
          actorAddress: existingOrder.walletAddress,
          orderId: existingOrder.id,
          details: `User clicked "Payment Done" for ${existingOrder.referenceCode} (${existingOrder.usdtAmount.toFixed(2)} USDT). Dispatched Email & Telegram alerts to Admin.`,
        },
      });

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        notifications,
      });
    }

    // Require whitelisted Admin Wallet authorization for administrative order status actions
    const callerWallet =
      body.adminAddress ||
      req.headers.get("x-admin-wallet") ||
      req.nextUrl.searchParams.get("adminWallet");

    if (!isAdminWalletAddress(callerWallet)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Wallet address is not an authorized Cryptohive Admin.",
        },
        { status: 403 }
      );
    }

    if (action === "CONFIRM_AND_CREDIT") {
      // Admin verified fiat hit bank account -> Triggers Ethers.js Treasury Payout -> Marks order completed
      if (existingOrder.orderType !== "BUY") {
        return NextResponse.json(
          {
            success: false,
            error: "Confirm & Credit treasury payout only applies to BUY orders.",
          },
          { status: 400 }
        );
      }

      const payoutResult = await executeTreasuryPayout({
        receivingWallet: existingOrder.receivingWallet,
        usdtAmount: existingOrder.usdtAmount,
        chainId: existingOrder.networkChainId,
        referenceCode: existingOrder.referenceCode,
      });

      const updatedOrder = await prisma.otcOrder.update({
        where: { id: orderId },
        data: {
          status: "completed",
          treasuryPayoutTxHash: payoutResult.txHash,
          adminNotes:
            adminNotes ||
            `Fiat verified. Treasury credited ${existingOrder.usdtAmount.toFixed(2)} USDT (${payoutResult.mode}).`,
          completedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "TREASURY_PAYOUT_COMPLETED",
          actorType: "ADMIN",
          actorAddress: adminAddress,
          orderId: updatedOrder.id,
          details: `Admin confirmed fiat receipt & credited ${updatedOrder.usdtAmount.toFixed(2)} USDT to ${updatedOrder.receivingWallet} for ${updatedOrder.referenceCode}. TxHash: ${payoutResult.txHash.slice(0, 18)}...`,
          metadataJson: JSON.stringify(payoutResult),
        },
      });

      // Dispatch Telegram & Email alerts to Admin notifying order completion
      const notifications = await dispatchMultiChannelOrderNotification(
        updatedOrder,
        {
          eventType: "ADMIN_COMPLETED",
          adminAddress,
          notes: updatedOrder.adminNotes || undefined,
          txHash: payoutResult.txHash,
          actionName: "CONFIRM_AND_CREDIT",
        }
      );

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        payoutResult,
        notifications,
      });
    }

    if (action === "APPROVE_PAYMENT") {
      // Intermediate confirmation step (`payment_confirmed`) before final completion
      const updatedOrder = await prisma.otcOrder.update({
        where: { id: orderId },
        data: {
          status: "payment_confirmed",
          adminNotes:
            adminNotes ||
            (existingOrder.orderType === "BUY"
              ? "Fiat transfer verified in corporate bank account. Queued for USDT dispatch."
              : "On-chain USDT deposit verified via txHash. Queued for corporate bank payout."),
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "ORDER_PAYMENT_CONFIRMED",
          actorType: "ADMIN",
          actorAddress: adminAddress,
          orderId: updatedOrder.id,
          details: `Admin verified incoming payment for ${updatedOrder.referenceCode} (${updatedOrder.orderType}). Status set to payment_confirmed.`,
        },
      });

      // Dispatch Telegram & Email alerts to Admin notifying order approval
      const notifications = await dispatchMultiChannelOrderNotification(
        updatedOrder,
        {
          eventType: "ADMIN_APPROVED",
          adminAddress,
          notes: updatedOrder.adminNotes || undefined,
          actionName: "APPROVE_PAYMENT",
        }
      );

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        notifications,
      });
    }

    if (action === "MARK_COMPLETED") {
      // Used primarily for SELL orders once Admin verifies txHash on-chain and transfers fiat to user's bank account
      const fiatPayoutReference =
        body.fiatPayoutReference?.trim() ||
        `BNK-SETTLE-${Math.floor(100000 + Math.random() * 900000)}`;

      let treasuryTxHash = existingOrder.treasuryPayoutTxHash;
      if (existingOrder.orderType === "BUY" && !treasuryTxHash) {
        const payoutResult = await executeTreasuryPayout({
          receivingWallet: existingOrder.receivingWallet,
          usdtAmount: existingOrder.usdtAmount,
          chainId: existingOrder.networkChainId,
          referenceCode: existingOrder.referenceCode,
        });
        treasuryTxHash = payoutResult.txHash;
      }

      const updatedOrder = await prisma.otcOrder.update({
        where: { id: orderId },
        data: {
          status: "completed",
          fiatPayoutReference:
            existingOrder.orderType === "SELL" ? fiatPayoutReference : null,
          treasuryPayoutTxHash: treasuryTxHash,
          adminNotes:
            adminNotes ||
            (existingOrder.orderType === "SELL"
              ? `On-chain USDT verified. Corporate bank transfer of ${existingOrder.fiatSymbol}${existingOrder.fiatAmount.toLocaleString()} sent to ${existingOrder.userBankName} (${existingOrder.userAccountNumber}).`
              : `Order settled and USDT credited to ${existingOrder.receivingWallet}.`),
          completedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          action:
            existingOrder.orderType === "SELL"
              ? "SELL_ORDER_FIAT_SETTLED"
              : "BUY_ORDER_COMPLETED",
          actorType: "ADMIN",
          actorAddress: adminAddress,
          orderId: updatedOrder.id,
          details:
            existingOrder.orderType === "SELL"
              ? `Admin verified on-chain txHash (${existingOrder.cryptoDepositTxHash?.slice(0, 14)}...) & completed fiat bank payout of ${existingOrder.fiatSymbol}${existingOrder.fiatAmount.toLocaleString()} to ${existingOrder.userAccountName} (${existingOrder.userBankName}). Ref: ${fiatPayoutReference}`
              : `Admin marked Buy Order ${existingOrder.referenceCode} completed.`,
        },
      });

      // Dispatch Telegram & Email alerts to Admin notifying order completion
      const notifications = await dispatchMultiChannelOrderNotification(
        updatedOrder,
        {
          eventType: "ADMIN_COMPLETED",
          adminAddress,
          notes: updatedOrder.adminNotes || undefined,
          actionName: "MARK_COMPLETED",
        }
      );

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        notifications,
      });
    }

    if (action === "REJECT_ORDER" || action === "CANCEL_ORDER") {
      const targetStatus = action === "REJECT_ORDER" ? "rejected" : "cancelled";
      const updatedOrder = await prisma.otcOrder.update({
        where: { id: orderId },
        data: {
          status: targetStatus,
          adminNotes:
            adminNotes ||
            `Order ${targetStatus} by Admin (${adminAddress}).`,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: `ORDER_${targetStatus.toUpperCase()}`,
          actorType: "ADMIN",
          actorAddress: adminAddress,
          orderId: updatedOrder.id,
          details: `Order ${updatedOrder.referenceCode} marked as ${targetStatus}. Reason: ${updatedOrder.adminNotes}`,
        },
      });

      // Dispatch Telegram & Email alerts to Admin notifying rejection or cancellation
      const notifications = await dispatchMultiChannelOrderNotification(
        updatedOrder,
        {
          eventType:
            action === "REJECT_ORDER" ? "ADMIN_REJECTED" : "ADMIN_CANCELLED",
          adminAddress,
          notes: updatedOrder.adminNotes || undefined,
          actionName: action,
        }
      );

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        notifications,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: `Unsupported order action: ${action}`,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process order action.",
      },
      { status: 500 }
    );
  }
}
