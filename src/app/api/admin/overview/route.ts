import { NextRequest, NextResponse } from "next/server";
import { ensureSystemConfig, prisma } from "@/lib/db";
import { isAdminWalletAddress } from "@/lib/web3";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const adminWallet =
      req.headers.get("x-admin-wallet") ||
      req.nextUrl.searchParams.get("adminWallet");

    if (!isAdminWalletAddress(adminWallet)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Connected wallet is not a registered Cryptohive Admin.",
        },
        { status: 401 }
      );
    }

    await ensureSystemConfig();

    let notifications: any[] = [];
    let auditLogs: any[] = [];
    let pendingCount = 0;

    try {
      [notifications, auditLogs, pendingCount] = await Promise.all([
        prisma.adminNotification.findMany({
          orderBy: { createdAt: "desc" },
          take: 40,
        }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 60,
        }),
        prisma.otcOrder.count({
          where: {
            status: {
              in: ["pending_payment", "pending_fiat_payout", "payment_confirmed"],
            },
          },
        }),
      ]);
    } catch (dbErr) {
      console.warn("Prisma overview telemetry fallback:", dbErr);
    }

    const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      unreadNotificationsCount,
      pendingOrdersCount: pendingCount,
      notifications,
      auditLogs,
      channelsConfigured: {
        email: Boolean(
          process.env.RESEND_API_KEY?.trim() || process.env.SENDGRID_API_KEY?.trim()
        ),
        telegram: Boolean(
          process.env.TELEGRAM_BOT_TOKEN?.trim() &&
            process.env.TELEGRAM_ADMIN_CHAT_ID?.trim()
        ),
        treasurySigner: Boolean(process.env.TREASURY_PRIVATE_KEY?.trim()),
      },
    });
  } catch (error) {
    console.error("Failed to fetch admin overview:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch admin telemetry.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const adminWallet =
      req.headers.get("x-admin-wallet") ||
      req.nextUrl.searchParams.get("adminWallet") ||
      body.adminAddress;

    if (!isAdminWalletAddress(adminWallet)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Connected wallet is not a registered Cryptohive Admin.",
        },
        { status: 401 }
      );
    }

    if (body.action === "MARK_ALL_READ") {
      await prisma.adminNotification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    if (body.notificationId) {
      await prisma.adminNotification.update({
        where: { id: body.notificationId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update admin notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notification state." },
      { status: 500 }
    );
  }
}
