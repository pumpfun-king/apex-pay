import { OtcOrderItem, RateConfig } from "@/store/useApexStore";
import { formatAddress } from "./web3";

export function generateReceiptHtml(
  order: OtcOrderItem,
  rateConfig?: RateConfig | null,
  logoSvg?: string
): string {
  const isCompleted = order.status === "completed";
  const isBuy = order.orderType === "BUY";

  const formattedCreated = new Date(order.createdAt).toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedCompleted = order.completedAt
    ? new Date(order.completedAt).toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  const statusText = isCompleted
    ? "COMPLETED & SETTLED"
    : order.status === "pending_fiat_payout"
    ? "PENDING FIAT PAYOUT"
    : order.status === "payment_confirmed"
    ? "PAYMENT CONFIRMED"
    : "PENDING VERIFICATION";

  const statusSubtitle = isCompleted
    ? "This transaction has been successfully verified, confirmed, and settled by the Cryptohive Treasury Desk."
    : "This order is logged and currently awaiting admin confirmation and settlement.";

  const fiatFormatted = `${order.fiatSymbol || "₦"}${Number(order.fiatAmount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const usdtFormatted = `${Number(order.usdtAmount).toFixed(2)} USDT`;
  const rateFormatted = `1 USDT = ${order.fiatSymbol || "₦"}${Number(order.exchangeRateApplied).toLocaleString()}`;

  const bankName = isBuy
    ? rateConfig?.bankName || "Moniepoint MFB / Cryptohive Corporate"
    : order.userBankName || "Beneficiary Bank";
  const bankAccNumber = isBuy
    ? rateConfig?.bankAccountNumber || "6513489201"
    : order.userAccountNumber || "—";
  const bankAccName = isBuy
    ? rateConfig?.bankAccountName || "CRYPTOHIVE GLOBAL OTC LTD"
    : order.userAccountName || "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cryptohive Receipt - ${order.referenceCode}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background-color: #F4F5F8;
      color: #0A0B0E;
      padding: 30px 15px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .receipt-container {
      max-width: 680px;
      width: 100%;
      background: #FFFFFF;
      border-radius: 24px;
      box-shadow: 0 15px 40px rgba(10, 11, 14, 0.08);
      overflow: hidden;
      border: 1px solid rgba(10, 11, 14, 0.08);
    }
    .receipt-header {
      background: #0A0B0E;
      color: #FFFFFF;
      padding: 32px 36px 28px;
      position: relative;
    }
    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo-wrap {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .brand-logo-wrap svg {
      width: 44px;
      height: 44px;
      object-fit: contain;
      filter: drop-shadow(0 3px 6px rgba(10, 11, 14, 0.25));
    }
    .brand-logo-img {
      width: 44px;
      height: 44px;
      object-fit: contain;
      flex-shrink: 0;
      filter: drop-shadow(0 3px 6px rgba(10, 11, 14, 0.25));
    }
    .brand-name {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #FFFFFF;
    }
    .brand-sub {
      font-size: 11px;
      color: #A1A1AA;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
    }
    .ref-badge {
      background: rgba(255, 199, 0, 0.12);
      border: 1px solid rgba(255, 199, 0, 0.3);
      color: #FFC700;
      padding: 6px 14px;
      border-radius: 100px;
      font-family: monospace;
      font-size: 13px;
      font-weight: 800;
    }
    .receipt-title {
      font-size: 24px;
      font-weight: 900;
      margin-top: 4px;
    }
    .receipt-meta-time {
      font-size: 12px;
      color: #A1A1AA;
      margin-top: 4px;
    }

    /* Status Banner */
    .status-banner {
      padding: 16px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid #ECEEF2;
    }
    .status-completed {
      background: #FFFDF0;
      border-left: 6px solid #FFC700;
    }
    .status-pending {
      background: #FFFDF5;
      border-left: 6px solid #D97706;
    }
    .status-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .pill-completed {
      background: #0A0B0E;
      color: #FFC700;
    }
    .pill-pending {
      background: #FFF8DB;
      color: #B45309;
      border: 1px solid #FDE68A;
    }
    .status-text-sub {
      font-size: 12px;
      color: #52525B;
      line-height: 1.4;
    }

    /* Summary Card */
    .summary-section {
      padding: 28px 36px 20px;
      background: #F7F8FA;
      margin: 24px 36px;
      border-radius: 20px;
      border: 1px solid #E4E7EB;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .summary-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #71717A;
      margin-bottom: 4px;
    }
    .summary-value {
      font-size: 22px;
      font-weight: 900;
      color: #0A0B0E;
      font-family: monospace;
    }
    .summary-highlight {
      color: #B45309;
    }

    /* Detail Rows */
    .details-table {
      width: calc(100% - 72px);
      margin: 0 36px 28px;
      border-collapse: collapse;
    }
    .details-table tr {
      border-bottom: 1px solid #F0F2F5;
    }
    .details-table tr:last-child {
      border-bottom: none;
    }
    .details-table td {
      padding: 13px 0;
      font-size: 13px;
    }
    .details-table td.col-label {
      color: #71717A;
      font-weight: 600;
      width: 40%;
    }
    .details-table td.col-value {
      color: #0A0B0E;
      font-weight: 700;
      text-align: right;
      font-family: monospace;
    }
    .details-table td.col-value.text-normal {
      font-family: inherit;
    }

    /* Bank Box */
    .bank-box {
      margin: 0 36px 28px;
      padding: 20px 24px;
      border-radius: 16px;
      background: #FFFFFF;
      border: 1px solid #E4E7EB;
      box-shadow: 0 2px 8px rgba(10, 11, 14, 0.02);
    }
    .bank-box-title {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #71717A;
      margin-bottom: 12px;
    }
    .bank-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .bank-row:last-child {
      margin-bottom: 0;
    }
    .bank-row-label {
      color: #71717A;
    }
    .bank-row-value {
      font-weight: 700;
      color: #0A0B0E;
      font-family: monospace;
    }

    /* Footer */
    .receipt-footer {
      padding: 20px 36px 28px;
      border-top: 1px solid #ECEEF2;
      background: #FAFAFB;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .footer-note {
      font-size: 11px;
      color: #71717A;
      line-height: 1.5;
    }
    .btn-row {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }
    .print-btn {
      flex: 1;
      padding: 14px 20px;
      border-radius: 100px;
      background: #0A0B0E;
      color: #FFC700;
      font-weight: 800;
      font-size: 14px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .print-btn:hover {
      background: #27272A;
    }

    @media print {
      body {
        background: #FFFFFF;
        padding: 0;
      }
      .receipt-container {
        box-shadow: none;
        border: none;
        max-width: 100%;
      }
      .btn-row {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <div class="header-top">
        <div class="brand-group">
          ${
            logoSvg
              ? `<div class="brand-logo-wrap">${logoSvg}</div>`
              : `<img src="/logo.svg" alt="Cryptohive Logo" class="brand-logo-img" />`
          }
          <div>
            <div class="brand-name">Cryptohive</div>
            <div class="brand-sub">DeFi Digital Asset Exchange</div>
          </div>
        </div>
        <div class="ref-badge">${order.referenceCode}</div>
      </div>
      <div class="receipt-title">Transaction Receipt</div>
      <div class="receipt-meta-time">Created on: ${formattedCreated}</div>
    </div>

    <!-- Live Status Banner -->
    <div class="status-banner ${isCompleted ? "status-completed" : "status-pending"}">
      <div>
        <span class="status-badge-pill ${isCompleted ? "pill-completed" : "pill-pending"}">
          ● ${statusText}
        </span>
        <div class="status-text-sub" style="margin-top: 6px;">
          ${statusSubtitle}
        </div>
      </div>
    </div>

    <!-- Summary Box -->
    <div class="summary-section">
      <div class="summary-grid">
        <div>
          <div class="summary-label">${isBuy ? "Total Amount Paid" : "Crypto Deposited"}</div>
          <div class="summary-value ${isBuy ? "summary-highlight" : ""}">${isBuy ? fiatFormatted : usdtFormatted}</div>
        </div>
        <div>
          <div class="summary-label">${isBuy ? "USDT To Receive" : "Payout Received"}</div>
          <div class="summary-value ${!isBuy ? "summary-highlight" : ""}">${isBuy ? usdtFormatted : fiatFormatted}</div>
        </div>
      </div>
    </div>

    <!-- Table Details -->
    <table class="details-table">
      <tbody>
        <tr>
          <td class="col-label">Order Type</td>
          <td class="col-value text-normal">${isBuy ? "Buy USDT (Fiat → Crypto)" : "Sell USDT (Crypto → Fiat)"}</td>
        </tr>
        <tr>
          <td class="col-label">Applied Rate</td>
          <td class="col-value">${rateFormatted}</td>
        </tr>
        <tr>
          <td class="col-label">Payment Method</td>
          <td class="col-value text-normal">Bank Transfer</td>
        </tr>
        <tr>
          <td class="col-label">Receiving Wallet</td>
          <td class="col-value" title="${order.receivingWallet || order.walletAddress}">
            ${formatAddress(order.receivingWallet || order.walletAddress)}
          </td>
        </tr>
        <tr>
          <td class="col-label">Network</td>
          <td class="col-value text-normal">${order.networkName || "Ethereum Mainnet"}</td>
        </tr>
        ${
          order.paymentReference
            ? `<tr>
                <td class="col-label">Payment Reference</td>
                <td class="col-value">${order.paymentReference}</td>
              </tr>`
            : ""
        }
        ${
          order.cryptoDepositTxHash
            ? `<tr>
                <td class="col-label">Deposit TxHash</td>
                <td class="col-value">${order.cryptoDepositTxHash.slice(0, 14)}...${order.cryptoDepositTxHash.slice(-8)}</td>
              </tr>`
            : ""
        }
        ${
          order.treasuryPayoutTxHash
            ? `<tr>
                <td class="col-label">Treasury Dispatch Tx</td>
                <td class="col-value">${order.treasuryPayoutTxHash.slice(0, 14)}...${order.treasuryPayoutTxHash.slice(-8)}</td>
              </tr>`
            : ""
        }
        ${
          order.fiatPayoutReference
            ? `<tr>
                <td class="col-label">Bank Settlement Ref</td>
                <td class="col-value">${order.fiatPayoutReference}</td>
              </tr>`
            : ""
        }
        ${
          formattedCompleted
            ? `<tr>
                <td class="col-label">Settlement Time</td>
                <td class="col-value text-normal">${formattedCompleted}</td>
              </tr>`
            : ""
        }
      </tbody>
    </table>

    <!-- Bank Details Card -->
    <div class="bank-box">
      <div class="bank-box-title">
        ${isBuy ? "Bank Details" : "Your Beneficiary Bank Account"}
      </div>
      <div class="bank-row">
        <span class="bank-row-label">Bank Name:</span>
        <span class="bank-row-value">${bankName}</span>
      </div>
      <div class="bank-row">
        <span class="bank-row-label">Account Number:</span>
        <span class="bank-row-value" style="color: #B45309;">${bankAccNumber}</span>
      </div>
      <div class="bank-row">
        <span class="bank-row-label">Account Name:</span>
        <span class="bank-row-value">${bankAccName}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="receipt-footer">
      <div class="footer-note">
        <strong>Security Notice:</strong> This digital receipt is cryptographically tied to reference code <strong>${order.referenceCode}</strong>. Settlement records are maintained in the Cryptohive DeFi ledger. For support, quote your reference code to our treasury desk.
      </div>
      <div class="btn-row">
        <button class="print-btn" onclick="window.print()">
          🖨️ Print / Save as PDF
        </button>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function downloadReceiptAsFile(
  order: OtcOrderItem,
  rateConfig?: RateConfig | null
): Promise<void> {
  let logoSvg = "";
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/logo.svg");
      if (res.ok) {
        logoSvg = await res.text();
      }
    } catch {
      // fallback
    }
  }

  const htmlContent = generateReceiptHtml(order, rateConfig, logoSvg);
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const statusSlug = order.status.toUpperCase();
  anchor.download = `Cryptohive-Receipt-${order.referenceCode}-${statusSlug}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
