import { prisma } from "./db";
import { OtcOrder } from "@prisma/client";

export interface NotificationDispatchSummary {
  dashboardNotificationId: string;
  email: {
    status: "sent" | "simulated" | "failed";
    provider: string;
    detail: string;
  };
  telegram: {
    status: "sent" | "simulated" | "failed";
    detail: string;
  };
}

export interface NotificationOptions {
  eventType?:
    | "PRICE_LOCKED"
    | "LOCK_REFRESHED"
    | "PAYMENT_DONE"
    | "ORDER_SUBMITTED"
    | "ADMIN_APPROVED"
    | "ADMIN_COMPLETED"
    | "ADMIN_REJECTED"
    | "ADMIN_CANCELLED";
  previousRate?: number;
  newRate?: number;
  lockStartedAt?: string;
  notes?: string;
  adminAddress?: string;
  txHash?: string;
  actionName?: string;
}

function buildEmailHtml(order: OtcOrder, options?: NotificationOptions): string {
  const isBuy = order.orderType === "BUY";
  const badgeColor = "#FFC700";
  const event = options?.eventType || "ORDER_SUBMITTED";

  let badgeText = `NEW ${order.orderType} ORDER`;
  let alertIntro = `A new ${isBuy ? "Fiat-to-Crypto (Buy USDT)" : "Crypto-to-Fiat (Sell USDT)"} order requires admin verification and settlement on Cryptohive.`;

  if (event === "PRICE_LOCKED") {
    badgeText = "🔒 15-MIN PRICE LOCKED";
    alertIntro = isBuy
      ? `A buyer has initiated a Buy USDT order on Step 2. The exchange rate is locked for a 15-minute price guarantee window starting at ${options?.lockStartedAt || new Date(order.createdAt).toLocaleTimeString()}.`
      : `A seller has initiated a Sell USDT order on Step 2. The exchange rate is locked for a 15-minute price guarantee window starting at ${options?.lockStartedAt || new Date(order.createdAt).toLocaleTimeString()}.`;
  } else if (event === "LOCK_REFRESHED") {
    badgeText = "🔄 15-MIN LOCK EXPIRED & REFRESHED";
    alertIntro = isBuy
      ? `The 15-minute price lock window for Buy order ${order.referenceCode} expired without user payment. The amount has been automatically refreshed to the latest live market rate to protect the desk against currency volatility. New 15-min window started at ${options?.lockStartedAt || new Date().toLocaleTimeString()}.`
      : `The 15-minute price lock window for Sell order ${order.referenceCode} expired without on-chain USDT deposit. The payout amount has been automatically refreshed to the latest live market sell rate to protect the desk against currency volatility. New 15-min window started at ${options?.lockStartedAt || new Date().toLocaleTimeString()}.`;
  } else if (event === "PAYMENT_DONE") {
    badgeText = isBuy ? "✅ PAYMENT DONE CONFIRMED" : "✅ USDT DEPOSIT CONFIRMED";
    alertIntro = isBuy
      ? `The buyer has transferred funds and clicked "Payment Done". Please verify bank credit of ${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} into your corporate account and execute treasury credit.`
      : `The seller has transferred ${order.usdtAmount.toFixed(2)} USDT on-chain. Please verify on-chain deposit (TxHash: ${order.cryptoDepositTxHash || "Pending"}) and transfer ${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} to client bank account: ${order.userBankName || "Bank"} — ${order.userAccountNumber || "N/A"} (${order.userAccountName || "Client"}).`;
  } else if (event === "ADMIN_APPROVED") {
    badgeText = "⚡ PAYMENT APPROVED";
    alertIntro = `An authorized admin has verified payment for order ${order.referenceCode} (${order.orderType}). Status has been updated to <strong>payment_confirmed</strong>.`;
  } else if (event === "ADMIN_COMPLETED") {
    badgeText = "🎉 ORDER COMPLETED & SETTLED";
    alertIntro = `Order ${order.referenceCode} (${order.orderType}) has been marked as <strong>COMPLETED</strong> and fully settled on Cryptohive. ${isBuy ? "Treasury USDT has been credited to user." : "Corporate fiat bank payout has been sent to client."}`;
  } else if (event === "ADMIN_REJECTED") {
    badgeText = "❌ ORDER REJECTED";
    alertIntro = `Order ${order.referenceCode} (${order.orderType}) was <strong>REJECTED</strong> by Admin desk (${options?.adminAddress || "Admin"}). ${options?.notes ? `Reason: ${options.notes}` : ""}`;
  } else if (event === "ADMIN_CANCELLED") {
    badgeText = "🚫 ORDER CANCELLED";
    alertIntro = `Order ${order.referenceCode} (${order.orderType}) was <strong>CANCELLED</strong> by Admin desk (${options?.adminAddress || "Admin"}). ${options?.notes ? `Reason: ${options.notes}` : ""}`;
  }

  const proofLabel = isBuy ? "Fiat Payment Reference" : "On-Chain Deposit TxHash";
  const proofValue = isBuy
    ? `${order.paymentReference || "N/A"} (${order.senderAccountName || "Verified Sender"})`
    : order.cryptoDepositTxHash || "N/A";

  const lockTimeRow = options?.lockStartedAt
    ? `<tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">Lock Started At</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #FFC700; font-weight: 700; text-align: right;">${options.lockStartedAt} (15m window)</td>
      </tr>`
    : "";

  const statusRow = `<tr>
    <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">Current Status</td>
    <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #FFC700; font-family: monospace; font-weight: 700; text-align: right;">${order.status.toUpperCase()}</td>
  </tr>`;

  const adminOperatorRow = options?.adminAddress
    ? `<tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">Admin Operator</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #FFC700; font-family: monospace; font-size: 12px; text-align: right;">${options.adminAddress}</td>
      </tr>`
    : "";

  const notesRow = (options?.notes || order.adminNotes)
    ? `<tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">Admin Notes</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #D1D5DB; font-size: 12px; text-align: right;">${options?.notes || order.adminNotes}</td>
      </tr>`
    : "";

  const treasuryPayoutRow = order.treasuryPayoutTxHash
    ? `<tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">Treasury Payout Tx</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #FFC700; font-family: monospace; font-size: 12px; text-align: right; word-break: break-all;">${order.treasuryPayoutTxHash}</td>
      </tr>`
    : "";

  const fiatPayoutRow = order.fiatPayoutReference
    ? `<tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">Fiat Payout Reference</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #FFC700; font-family: monospace; font-size: 12px; text-align: right;">${order.fiatPayoutReference}</td>
      </tr>`
    : "";

  return `
    <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; background-color: #080C07; color: #F9FAFB; padding: 32px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1E2E19;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF;">Cryptohive DeFi Desk Alert</h2>
        <span style="background: ${badgeColor}; color: #000000; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px;">
          ${badgeText}
        </span>
      </div>
      <p style="color: #D1D5DB; font-size: 14px; margin-bottom: 20px; line-height: 1.5;">
        ${alertIntro}
      </p>
      <table style="width: 100%; border-collapse: collapse; background: #0E150C; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">Order Reference</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #FFFFFF; font-family: monospace; font-weight: 700; text-align: right;">${order.referenceCode}</td>
        </tr>
        ${statusRow}
        ${adminOperatorRow}
        ${lockTimeRow}
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">User Wallet</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #FFC700; font-family: monospace; font-size: 12px; text-align: right;">${order.walletAddress}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">USDT Volume</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #FFFFFF; font-weight: 700; text-align: right;">${order.usdtAmount.toFixed(2)} USDT ($${order.usdEquivalent.toFixed(2)})</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">Fiat Settlement</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #FFFFFF; font-weight: 700; text-align: right;">${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${order.fiatCurrency})</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">Rate Applied</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #D1D5DB; text-align: right;">${order.fiatSymbol}${order.exchangeRateApplied.toLocaleString()} / USDT</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #9CA3AF; font-size: 13px;">${proofLabel}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #1E2E19; color: #FFC700; font-family: monospace; font-size: 12px; text-align: right; word-break: break-all;">${proofValue}</td>
        </tr>
        ${treasuryPayoutRow}
        ${fiatPayoutRow}
        ${notesRow}
      </table>
      ${
        !isBuy
          ? `<div style="background: #141F11; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: #D1D5DB;">
              <strong>Client Payout Bank:</strong> ${order.userBankName} — ${order.userAccountNumber} (${order.userAccountName})
            </div>`
          : ""
      }
      <p style="color: #6B7280; font-size: 12px; margin: 0;">
        Timestamp: ${new Date(order.createdAt).toUTCString()} • Network: ${order.networkName}
      </p>
    </div>
  `;
}

function buildTelegramMarkdown(order: OtcOrder, options?: NotificationOptions): string {
  const isBuy = order.orderType === "BUY";
  const event = options?.eventType || "ORDER_SUBMITTED";

  // Global Admin Status Update Events (For both BUY and SELL transactions)
  if (event === "ADMIN_APPROVED") {
    const lines = [
      "⚡ *CRYPTOHIVE • ORDER APPROVED BY ADMIN*",
      "━━━━━━━━━━━━━━━━━━━━",
      `• *Order Reference:* \`${order.referenceCode}\``,
      `• *Order Type:* *${isBuy ? "BUY (Fiat→USDT)" : "SELL (USDT→Fiat)"}*`,
      `• *Updated Status:* *payment_confirmed*`,
      `• *USDT Volume:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
      `• *Fiat Amount:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
      `• *Rate Applied:* *${order.fiatSymbol}${order.exchangeRateApplied.toLocaleString()} / USDT*`,
      `• *User Wallet:* \`${order.walletAddress}\``,
    ];
    if (isBuy) {
      lines.push(`• *Receiving Wallet:* \`${order.receivingWallet}\``);
      lines.push(`• *Payment Reference:* \`${order.paymentReference || "N/A"}\``);
    } else {
      lines.push(`• *Payout Bank:* *${order.userBankName} • ${order.userAccountNumber}* (${order.userAccountName})`);
    }
    if (options?.adminAddress) {
      lines.push(`• *Admin Operator:* \`${options.adminAddress}\``);
    }
    if (options?.notes || order.adminNotes) {
      lines.push(`• *Admin Notes:* ${options?.notes || order.adminNotes}`);
    }
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push("👇 _Tap below to open Admin Vault:_");
    return lines.join("\n");
  }

  if (event === "ADMIN_COMPLETED") {
    const lines = [
      "🎉 *CRYPTOHIVE • ORDER COMPLETED & SETTLED*",
      "━━━━━━━━━━━━━━━━━━━━",
      `• *Order Reference:* \`${order.referenceCode}\``,
      `• *Order Type:* *${isBuy ? "BUY (Fiat→USDT)" : "SELL (USDT→Fiat)"}*`,
      `• *Updated Status:* *completed (Settled ✓)*`,
      `• *USDT Volume:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
      `• *Fiat Settlement:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
      `• *Rate Applied:* *${order.fiatSymbol}${order.exchangeRateApplied.toLocaleString()} / USDT*`,
      `• *User Wallet:* \`${order.walletAddress}\``,
    ];
    if (isBuy) {
      const payoutTx = order.treasuryPayoutTxHash || options?.txHash || "Settled On-Chain";
      lines.push(`• *Treasury Payout Tx:* \`${payoutTx}\``);
    } else {
      const fiatRef = order.fiatPayoutReference || "Bank Transfer Complete";
      lines.push(`• *Fiat Payout Reference:* \`${fiatRef}\``);
      lines.push(`• *Client Bank:* *${order.userBankName} • ${order.userAccountNumber}* (${order.userAccountName})`);
    }
    if (options?.adminAddress) {
      lines.push(`• *Admin Operator:* \`${options.adminAddress}\``);
    }
    if (options?.notes || order.adminNotes) {
      lines.push(`• *Settlement Notes:* ${options?.notes || order.adminNotes}`);
    }
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push("👇 _Tap below to open Admin Vault:_");
    return lines.join("\n");
  }

  if (event === "ADMIN_REJECTED") {
    const lines = [
      "❌ *CRYPTOHIVE • ORDER REJECTED BY ADMIN*",
      "━━━━━━━━━━━━━━━━━━━━",
      `• *Order Reference:* \`${order.referenceCode}\``,
      `• *Order Type:* *${isBuy ? "BUY (Fiat→USDT)" : "SELL (USDT→Fiat)"}*`,
      `• *Updated Status:* *rejected*`,
      `• *USDT Volume:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
      `• *Fiat Amount:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
      `• *User Wallet:* \`${order.walletAddress}\``,
    ];
    if (options?.adminAddress) {
      lines.push(`• *Admin Operator:* \`${options.adminAddress}\``);
    }
    lines.push(`• *Reason / Notes:* *${options?.notes || order.adminNotes || "Order rejected by Admin desk."}*`);
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push("👇 _Tap below to open Admin Vault:_");
    return lines.join("\n");
  }

  if (event === "ADMIN_CANCELLED") {
    const lines = [
      "🚫 *CRYPTOHIVE • ORDER CANCELLED BY ADMIN*",
      "━━━━━━━━━━━━━━━━━━━━",
      `• *Order Reference:* \`${order.referenceCode}\``,
      `• *Order Type:* *${isBuy ? "BUY (Fiat→USDT)" : "SELL (USDT→Fiat)"}*`,
      `• *Updated Status:* *cancelled*`,
      `• *USDT Volume:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
      `• *Fiat Amount:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
      `• *User Wallet:* \`${order.walletAddress}\``,
    ];
    if (options?.adminAddress) {
      lines.push(`• *Admin Operator:* \`${options.adminAddress}\``);
    }
    lines.push(`• *Reason / Notes:* *${options?.notes || order.adminNotes || "Order cancelled by Admin desk."}*`);
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push("👇 _Tap below to open Admin Vault:_");
    return lines.join("\n");
  }

  if (isBuy) {
    if (event === "PRICE_LOCKED") {
      const startTime = options?.lockStartedAt || new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      return [
        "🔒 *CRYPTOHIVE • BUY ORDER INITIATED (PRICE LOCKED)*",
        "━━━━━━━━━━━━━━━━━━━━",
        `• *Order Reference:* \`${order.referenceCode}\``,
        `• *Locked Fiat Amount:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
        `• *USDT to Settle:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
        `• *Locked Exchange Rate:* *${order.fiatSymbol}${order.exchangeRateApplied.toLocaleString()} / USDT*`,
        `• *Lock Started:* *${startTime}* (15m Price Guarantee)`,
        `• *Receiving Wallet:* \`${order.receivingWallet}\``,
        `• *Payment Reference:* \`${order.paymentReference || "N/A"}\``,
        `• *Network:* ${order.networkName}`,
        `• *Status:* ⏳ User is on Step 2. 15-minute price lock active.`,
        "━━━━━━━━━━━━━━━━━━━━",
        "👇 _Tap the button below to copy the receiving wallet:_",
      ].join("\n");
    }

    if (event === "LOCK_REFRESHED") {
      const refreshTime = options?.lockStartedAt || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const prevRateStr = options?.previousRate ? ` (Prev: ${order.fiatSymbol}${options.previousRate.toLocaleString()})` : "";
      return [
        "🔄 *CRYPTOHIVE • 15-MIN LOCK EXPIRED & REFRESHED*",
        "━━━━━━━━━━━━━━━━━━━━",
        `• *Order Reference:* \`${order.referenceCode}\``,
        `• *New Refreshed Amount:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
        `• *USDT Volume:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
        `• *New Live Rate:* *${order.fiatSymbol}${order.exchangeRateApplied.toLocaleString()} / USDT*${prevRateStr}`,
        `• *New Lock Started:* *${refreshTime}* (Reset 15m Window)`,
        `• *Receiving Wallet:* \`${order.receivingWallet}\``,
        `• *Payment Reference:* \`${order.paymentReference || "N/A"}\``,
        `• *Status:* ⏳ 15 mins elapsed with no payment. Live rate auto-updated to protect desk.`,
        "━━━━━━━━━━━━━━━━━━━━",
        "👇 _Tap below to open Admin Vault:_",
      ].join("\n");
    }

    if (event === "PAYMENT_DONE") {
      return [
        "✅ *CRYPTOHIVE • BUYER CLICKED PAYMENT DONE*",
        "━━━━━━━━━━━━━━━━━━━━",
        `• *Order Reference:* \`${order.referenceCode}\``,
        `• *Fiat Paid by User:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
        `• *USDT to Release:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
        `• *Locked Rate:* *${order.fiatSymbol}${order.exchangeRateApplied.toLocaleString()} / USDT*`,
        `• *Receiving Wallet:* \`${order.receivingWallet}\``,
        `• *Payment Reference:* \`${order.paymentReference || "N/A"}\``,
        `• *Sender Account:* ${order.senderAccountName || "Verified Account Holder"}`,
        `• *Network:* ${order.networkName}`,
        `• *Action Needed:* Admin please verify bank credit and click 'Confirm & Credit'`,
        "━━━━━━━━━━━━━━━━━━━━",
        "👇 _Tap the button below to instantly copy receiving wallet:_",
      ].join("\n");
    }

    // Default Buy order submitted
    return [
      "🟢 *CRYPTOHIVE • NEW BUY USDT ORDER*",
      "━━━━━━━━━━━━━━━━━━━━",
      `• *Order Reference:* \`${order.referenceCode}\``,
      `• *USDT to Send:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
      `• *Fiat Paid by User:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
      `• *Receiving Wallet:* \`${order.receivingWallet}\``,
      `• *Payment Ref:* \`${order.paymentReference || "N/A"}\``,
      `• *Sender Account Name:* ${order.senderAccountName || "N/A"}`,
      `• *Network:* ${order.networkName}`,
      "━━━━━━━━━━━━━━━━━━━━",
      "👇 _Tap the button below to instantly copy the receiving wallet:_",
    ].join("\n");
  } else {
    // SELL USDT -> Fiat
    if (event === "PRICE_LOCKED") {
      const startTime = options?.lockStartedAt || new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      return [
        "🔒 *CRYPTOHIVE • SELL ORDER INITIATED (PRICE LOCKED)*",
        "━━━━━━━━━━━━━━━━━━━━",
        `• *Order Reference:* \`${order.referenceCode}\``,
        `• *USDT to Deposit:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
        `• *Locked Fiat Payout:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
        `• *Locked Sell Rate:* *${order.fiatSymbol}${order.exchangeRateApplied.toLocaleString()} / USDT*`,
        `• *Lock Started:* *${startTime}* (15m Price Guarantee)`,
        `• *Receiving Treasury Wallet:* \`${order.receivingWallet}\``,
        `• *User Wallet:* \`${order.walletAddress}\``,
        `• *Network:* ${order.networkName}`,
        `• *Status:* ⏳ User is on Step 2. 15-minute price lock active.`,
        "━━━━━━━━━━━━━━━━━━━━",
        "👇 _Tap the button below to copy the receiving treasury wallet:_",
      ].join("\n");
    }

    if (event === "LOCK_REFRESHED") {
      const refreshTime = options?.lockStartedAt || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const prevRateStr = options?.previousRate ? ` (Prev: ${order.fiatSymbol}${options.previousRate.toLocaleString()})` : "";
      return [
        "🔄 *CRYPTOHIVE • 15-MIN LOCK EXPIRED & REFRESHED (SELL ORDER)*",
        "━━━━━━━━━━━━━━━━━━━━",
        `• *Order Reference:* \`${order.referenceCode}\``,
        `• *USDT to Deposit:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
        `• *New Refreshed Payout:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
        `• *New Live Sell Rate:* *${order.fiatSymbol}${order.exchangeRateApplied.toLocaleString()} / USDT*${prevRateStr}`,
        `• *New Lock Started:* *${refreshTime}* (Reset 15m Window)`,
        `• *Receiving Treasury Wallet:* \`${order.receivingWallet}\``,
        `• *Network:* ${order.networkName}`,
        `• *Status:* ⏳ 15 mins elapsed with no USDT deposit. Live rate auto-updated to protect desk.`,
        "━━━━━━━━━━━━━━━━━━━━",
        "👇 _Tap below to open Admin Vault:_",
      ].join("\n");
    }

    if (event === "PAYMENT_DONE") {
      return [
        "✅ *CRYPTOHIVE • SELL USDT DEPOSITED ON-CHAIN*",
        "━━━━━━━━━━━━━━━━━━━━",
        `• *Order Reference:* \`${order.referenceCode}\``,
        `• *USDT Deposited:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
        `• *Fiat to Pay Client:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
        `• *Locked Rate:* *${order.fiatSymbol}${order.exchangeRateApplied.toLocaleString()} / USDT*`,
        `• *Client Bank Name:* *${order.userBankName || "N/A"}*`,
        `• *Account Number:* \`${order.userAccountNumber || "N/A"}\``,
        `• *Account Name:* *${order.userAccountName || "N/A"}*`,
        `• *On-Chain TxHash:* \`${order.cryptoDepositTxHash || "N/A"}\``,
        `• *Network:* ${order.networkName}`,
        `• *Action Needed:* Admin please verify on-chain deposit and transfer fiat to client bank account.`,
        "━━━━━━━━━━━━━━━━━━━━",
        "👇 _Tap the button below to instantly copy the bank account number:_",
      ].join("\n");
    }

    return [
      "🟡 *CRYPTOHIVE • NEW SELL USDT ORDER*",
      "━━━━━━━━━━━━━━━━━━━━",
      `• *Order Reference:* \`${order.referenceCode}\``,
      `• *USDT Deposited:* \`${order.usdtAmount.toFixed(2)}\` *USDT*`,
      `• *Fiat to Pay Client:* *${order.fiatSymbol}${order.fiatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${order.fiatCurrency}*`,
      `• *Bank Name:* *${order.userBankName || "N/A"}*`,
      `• *Account Number:* \`${order.userAccountNumber || "N/A"}\``,
      `• *Account Name:* *${order.userAccountName || "N/A"}*`,
      `• *On-Chain TxHash:* \`${order.cryptoDepositTxHash || "N/A"}\``,
      `• *Network:* ${order.networkName}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👇 _Tap the button below to instantly copy the bank account number:_`,
    ].join("\n");
  }
}

function buildTelegramKeyboard(order: OtcOrder, options?: NotificationOptions) {
  const isBuy = order.orderType === "BUY";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptohive.exchange";
  const adminUrl = `${siteUrl}/hive-vault-ops`;

  if (options?.eventType?.startsWith("ADMIN_")) {
    return {
      inline_keyboard: [
        [
          {
            text: "🏦 Open Admin Vault",
            url: adminUrl,
          },
        ],
        [
          {
            text: `📋 Copy Reference (${order.referenceCode})`,
            copy_text: { text: order.referenceCode },
          },
          {
            text: "📋 Copy User Wallet",
            copy_text: { text: order.walletAddress },
          },
        ],
      ],
    };
  }

  if (isBuy) {
    return {
      inline_keyboard: [
        [
          {
            text: "📋 Copy Receiving Wallet",
            copy_text: { text: order.receivingWallet },
          },
        ],
        [
          {
            text: `📋 Copy USDT Amount (${order.usdtAmount.toFixed(2)})`,
            copy_text: { text: order.usdtAmount.toFixed(2) },
          },
          {
            text: "🏦 Open Admin Vault",
            url: adminUrl,
          },
        ],
      ],
    };
  } else {
    // If order is locked/waiting on Step 2 and has not deposited yet, allow copying treasury wallet & USDT amount
    const isLockedWithoutBank = !order.userAccountNumber || order.status === "pending_payment";
    if (isLockedWithoutBank) {
      return {
        inline_keyboard: [
          [
            {
              text: "📋 Copy Treasury Receiving Wallet",
              copy_text: { text: order.receivingWallet },
            },
          ],
          [
            {
              text: `📋 Copy USDT Amount (${order.usdtAmount.toFixed(2)})`,
              copy_text: { text: order.usdtAmount.toFixed(2) },
            },
            {
              text: "🏦 Open Admin Vault",
              url: adminUrl,
            },
          ],
        ],
      };
    }

    const bankAccount = order.userAccountNumber || "";
    const fiatAmountStr = String(order.fiatAmount);
    return {
      inline_keyboard: [
        [
          {
            text: `📋 Copy Bank Account (${bankAccount})`,
            copy_text: { text: bankAccount },
          },
        ],
        [
          {
            text: `📋 Copy Fiat Amount (${order.fiatSymbol}${order.fiatAmount.toLocaleString()})`,
            copy_text: { text: fiatAmountStr },
          },
          {
            text: "🏦 Open Admin Vault",
            url: adminUrl,
          },
        ],
      ],
    };
  }
}

async function sendAdminEmailAlert(
  order: OtcOrder,
  options?: NotificationOptions
): Promise<{
  status: "sent" | "simulated" | "failed";
  provider: string;
  detail: string;
}> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();
  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL || "treasury-ops@cryptohive.io";
  const fromEmail =
    process.env.EMAIL_FROM_ADDRESS ||
    "Cryptohive DeFi Desk <alerts@cryptohive.io>";

  const isBuy = order.orderType === "BUY";
  const event = options?.eventType || "ORDER_SUBMITTED";
  let subject = `[Cryptohive DeFi] New ${order.orderType} Order ${order.referenceCode} (${order.usdtAmount.toFixed(2)} USDT)`;
  if (event === "PRICE_LOCKED") {
    subject = isBuy
      ? `[Cryptohive] 🔒 Buy Order Price Locked: ${order.referenceCode} (${order.fiatSymbol}${order.fiatAmount.toLocaleString()} for ${order.usdtAmount.toFixed(2)} USDT)`
      : `[Cryptohive] 🔒 Sell Order Price Locked: ${order.referenceCode} (${order.usdtAmount.toFixed(2)} USDT for ${order.fiatSymbol}${order.fiatAmount.toLocaleString()})`;
  } else if (event === "LOCK_REFRESHED") {
    subject = isBuy
      ? `[Cryptohive] 🔄 15-Min Lock Expired & Refreshed: ${order.referenceCode} - New Amount: ${order.fiatSymbol}${order.fiatAmount.toLocaleString()}`
      : `[Cryptohive] 🔄 15-Min Lock Expired & Refreshed: ${order.referenceCode} - New Payout: ${order.fiatSymbol}${order.fiatAmount.toLocaleString()}`;
  } else if (event === "PAYMENT_DONE") {
    subject = isBuy
      ? `[Cryptohive] ✅ User Marked Payment Done: ${order.referenceCode} (${order.usdtAmount.toFixed(2)} USDT)`
      : `[Cryptohive] ✅ Sell USDT Deposited On-Chain: ${order.referenceCode} (${order.usdtAmount.toFixed(2)} USDT)`;
  } else if (event === "ADMIN_APPROVED") {
    subject = `[Cryptohive] ⚡ Order Approved: ${order.referenceCode} (${order.orderType}) - Payment Confirmed`;
  } else if (event === "ADMIN_COMPLETED") {
    subject = `[Cryptohive] 🎉 Order Completed & Settled: ${order.referenceCode} (${order.orderType} • ${order.usdtAmount.toFixed(2)} USDT)`;
  } else if (event === "ADMIN_REJECTED") {
    subject = `[Cryptohive] ❌ Order Rejected: ${order.referenceCode} (${order.orderType})`;
  } else if (event === "ADMIN_CANCELLED") {
    subject = `[Cryptohive] 🚫 Order Cancelled: ${order.referenceCode} (${order.orderType})`;
  }

  const html = buildEmailHtml(order, options);

  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [adminEmail],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          status: "failed",
          provider: "Resend",
          detail: `Resend HTTP ${response.status}: ${errText.slice(0, 120)}`,
        };
      }
      return {
        status: "sent",
        provider: "Resend",
        detail: `Dispatched to ${adminEmail} via Resend API`,
      };
    } catch (error) {
      return {
        status: "failed",
        provider: "Resend",
        detail: error instanceof Error ? error.message : "Resend network error",
      };
    }
  }

  if (sendgridKey) {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: adminEmail }] }],
          from: {
            email:
              fromEmail.replace(/.*<|>.*/g, "") || "alerts@cryptohive.io",
            name: "Cryptohive DeFi Desk",
          },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          status: "failed",
          provider: "SendGrid",
          detail: `SendGrid HTTP ${response.status}: ${errText.slice(0, 120)}`,
        };
      }
      return {
        status: "sent",
        provider: "SendGrid",
        detail: `Dispatched to ${adminEmail} via SendGrid v3`,
      };
    } catch (error) {
      return {
        status: "failed",
        provider: "SendGrid",
        detail:
          error instanceof Error ? error.message : "SendGrid network error",
      };
    }
  }

  return {
    status: "simulated",
    provider: "Resend/SendGrid Sandbox",
    detail: `Formatted email payload queued for ${adminEmail} (Configure RESEND_API_KEY or SENDGRID_API_KEY for live SMTP relay)`,
  };
}

async function sendTelegramBotAlert(
  order: OtcOrder,
  options?: NotificationOptions
): Promise<{
  status: "sent" | "simulated" | "failed";
  detail: string;
}> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  const markdownText = buildTelegramMarkdown(order, options);

  if (botToken && chatId) {
    try {
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const keyboard = buildTelegramKeyboard(order, options);
      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: markdownText,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
          reply_markup: keyboard,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          status: "failed",
          detail: `Telegram API HTTP ${response.status}: ${errText.slice(0, 120)}`,
        };
      }

      return {
        status: "sent",
        detail: `Markdown alert delivered to Telegram Chat ${chatId}`,
      };
    } catch (error) {
      return {
        status: "failed",
        detail:
          error instanceof Error ? error.message : "Telegram webhook failed",
      };
    }
  }

  return {
    status: "simulated",
    detail:
      "Telegram Markdown payload generated (Configure TELEGRAM_BOT_TOKEN & TELEGRAM_ADMIN_CHAT_ID for live webhook)",
  };
}

export async function dispatchMultiChannelOrderNotification(
  order: OtcOrder,
  options?: NotificationOptions
): Promise<NotificationDispatchSummary> {
  const isBuy = order.orderType === "BUY";
  const event = options?.eventType || "ORDER_SUBMITTED";

  let title = isBuy
    ? `New Buy Order • ${order.usdtAmount.toFixed(2)} USDT`
    : `New Sell Order • ${order.usdtAmount.toFixed(2)} USDT`;

  let message = isBuy
    ? `Wallet ${order.walletAddress.slice(0, 6)}...${order.walletAddress.slice(-4)} submitted ${order.fiatSymbol}${order.fiatAmount.toLocaleString()} (${order.referenceCode}). Ref: ${order.paymentReference}`
    : `Wallet ${order.walletAddress.slice(0, 6)}...${order.walletAddress.slice(-4)} sent ${order.usdtAmount.toFixed(2)} USDT on-chain (${order.referenceCode}). Payout: ${order.userBankName}`;

  if (event === "PRICE_LOCKED") {
    title = isBuy
      ? `🔒 Buy Price Locked • ${order.usdtAmount.toFixed(2)} USDT (${order.fiatSymbol}${order.fiatAmount.toLocaleString()})`
      : `🔒 Sell Price Locked • ${order.usdtAmount.toFixed(2)} USDT (${order.fiatSymbol}${order.fiatAmount.toLocaleString()})`;
    message = isBuy
      ? `Buyer locked ${order.fiatSymbol}${order.fiatAmount.toLocaleString()} for ${order.usdtAmount.toFixed(2)} USDT at ${order.fiatSymbol}${order.exchangeRateApplied}/USDT. Started at ${options?.lockStartedAt || new Date(order.createdAt).toLocaleTimeString()}. Ref: ${order.referenceCode}`
      : `Seller locked ${order.usdtAmount.toFixed(2)} USDT for ${order.fiatSymbol}${order.fiatAmount.toLocaleString()} payout at ${order.fiatSymbol}${order.exchangeRateApplied}/USDT. Started at ${options?.lockStartedAt || new Date(order.createdAt).toLocaleTimeString()}. Ref: ${order.referenceCode}`;
  } else if (event === "LOCK_REFRESHED") {
    title = isBuy
      ? `🔄 15-Min Lock Refreshed • ${order.usdtAmount.toFixed(2)} USDT (${order.fiatSymbol}${order.fiatAmount.toLocaleString()})`
      : `🔄 15-Min Sell Lock Refreshed • ${order.usdtAmount.toFixed(2)} USDT (${order.fiatSymbol}${order.fiatAmount.toLocaleString()})`;
    message = isBuy
      ? `15m window expired without transfer. Refreshed to live rate ${order.fiatSymbol}${order.exchangeRateApplied}/USDT (New total: ${order.fiatSymbol}${order.fiatAmount.toLocaleString()}). Started at ${options?.lockStartedAt || new Date().toLocaleTimeString()}. Ref: ${order.referenceCode}`
      : `15m sell lock expired without deposit. Refreshed to live rate ${order.fiatSymbol}${order.exchangeRateApplied}/USDT (New payout: ${order.fiatSymbol}${order.fiatAmount.toLocaleString()}). Started at ${options?.lockStartedAt || new Date().toLocaleTimeString()}. Ref: ${order.referenceCode}`;
  } else if (event === "PAYMENT_DONE") {
    title = isBuy
      ? `✅ Payment Done Confirmed • ${order.usdtAmount.toFixed(2)} USDT`
      : `✅ Sell USDT Deposited On-Chain • ${order.usdtAmount.toFixed(2)} USDT`;
    message = isBuy
      ? `Buyer clicked "Payment Done" for ${order.referenceCode} (${order.fiatSymbol}${order.fiatAmount.toLocaleString()}). Ready for admin verification.`
      : `Seller transferred ${order.usdtAmount.toFixed(2)} USDT on-chain (${order.cryptoDepositTxHash ? order.cryptoDepositTxHash.slice(0, 10) + '...' : 'Tx Submitted'}). Ready for fiat transfer to ${order.userBankName || 'Bank'} (${order.userAccountNumber || 'N/A'}).`;
  } else if (event === "ADMIN_APPROVED") {
    title = `⚡ Order Approved • ${order.referenceCode} (${order.orderType})`;
    message = `Admin (${options?.adminAddress ? options.adminAddress.slice(0, 8) + '...' : "Desk"}) approved incoming payment for ${order.referenceCode}. Status updated to payment_confirmed.`;
  } else if (event === "ADMIN_COMPLETED") {
    title = `🎉 Order Completed & Settled • ${order.referenceCode} (${order.orderType})`;
    message = `Order ${order.referenceCode} completed and settled. ${isBuy ? `Treasury credited ${order.usdtAmount.toFixed(2)} USDT to user.` : `Corporate fiat payout of ${order.fiatSymbol}${order.fiatAmount.toLocaleString()} sent to ${order.userBankName || "client bank"}.`}`;
  } else if (event === "ADMIN_REJECTED") {
    title = `❌ Order Rejected • ${order.referenceCode} (${order.orderType})`;
    message = `Order ${order.referenceCode} was rejected by admin (${options?.adminAddress ? options.adminAddress.slice(0, 8) + '...' : "Desk"}). Reason: ${options?.notes || order.adminNotes || "Rejected"}`;
  } else if (event === "ADMIN_CANCELLED") {
    title = `🚫 Order Cancelled • ${order.referenceCode} (${order.orderType})`;
    message = `Order ${order.referenceCode} was cancelled by admin (${options?.adminAddress ? options.adminAddress.slice(0, 8) + '...' : "Desk"}).`;
  }

  const [emailSettled, telegramSettled] = await Promise.allSettled([
    sendAdminEmailAlert(order, options),
    sendTelegramBotAlert(order, options),
  ]);

  const emailResult =
    emailSettled.status === "fulfilled"
      ? emailSettled.value
      : {
          status: "failed" as const,
          provider: "Email",
          detail: "Unhandled rejection",
        };

  const telegramResult =
    telegramSettled.status === "fulfilled"
      ? telegramSettled.value
      : { status: "failed" as const, detail: "Unhandled rejection" };

  const adminNotif = await prisma.adminNotification.create({
    data: {
      orderId: order.id,
      referenceCode: order.referenceCode,
      orderType: order.orderType,
      title,
      message,
      emailStatus: emailResult.status,
      telegramStatus: telegramResult.status,
      isRead: false,
    },
  });

  const isAdminEvent = event.startsWith("ADMIN_");
  await prisma.auditLog.create({
    data: {
      action:
        event === "PRICE_LOCKED"
          ? (isBuy ? "BUY_ORDER_PRICE_LOCKED" : "SELL_ORDER_PRICE_LOCKED")
          : event === "LOCK_REFRESHED"
          ? (isBuy ? "BUY_ORDER_LOCK_REFRESHED" : "SELL_ORDER_LOCK_REFRESHED")
          : event === "PAYMENT_DONE"
          ? (isBuy ? "BUY_ORDER_PAYMENT_DONE" : "SELL_ORDER_DEPOSIT_CONFIRMED")
          : isAdminEvent
          ? `ADMIN_ACTION_${event}`
          : "MULTI_CHANNEL_ALERT_DISPATCHED",
      actorType: isAdminEvent ? "ADMIN" : event === "LOCK_REFRESHED" ? "SYSTEM" : "USER",
      actorAddress: isAdminEvent ? (options?.adminAddress || "ADMIN_DESK") : order.walletAddress,
      orderId: order.id,
      details: `[${event}] Dispatched Cryptohive Admin alert, Email (${emailResult.status} via ${emailResult.provider}), and Telegram Bot webhook (${telegramResult.status}) for ${order.referenceCode}.`,
      metadataJson: JSON.stringify({
        email: emailResult,
        telegram: telegramResult,
        event,
        options,
      }),
    },
  });

  return {
    dashboardNotificationId: adminNotif.id,
    email: emailResult,
    telegram: telegramResult,
  };
}
