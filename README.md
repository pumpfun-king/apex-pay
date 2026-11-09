# ApexPay — Institutional Web3 OTC & P2P Settlement Exchange

A production-ready, dark-mode-first Web3 OTC & P2P Exchange built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Ethers.js v6**, **Zustand**, and **Prisma ORM**.

---

## Core Architecture & Modules

### 1. Authentication & Web3 Dashboard
- **EVM Wallet Integration:** Supports **MetaMask**, **Coinbase Wallet** (`window.ethereum` EIP-1193), and an **Instant Web3 Signer** session for testing across Ethereum Mainnet, BNB Smart Chain, Polygon POS, Arbitrum One, and Sepolia Testnet.
- **Auto-Reconnect & Live Sync:** Automatically reconnects sessions, listens to `accountsChanged` / `chainChanged`, and syncs native + ERC-20 USDT balances.
- **Dashboard Overview:** Displays **Total Volume Traded**, **Active OTC Orders**, and **Wallet Address Status**, paired with a real-time **Recent User Transactions** table.

### 2. Buy Crypto Workflow (`Fiat -> USDT`)
- **Strict Minimum Trade Limit:** Enforces a strict `$5.00 USD` equivalent minimum trade limit in local fiat (`5 * buyRate`) on both the client and backend API.
- **Live Rate Locking:** Bi-directional calculator (`You Pay Fiat` ↔ `You Receive USDT`) synced to the Admin-set **Buy Rate** stored in the SQL database.
- **Corporate Bank Settlement & Treasury Credit:** Logs orders as `pending_payment`, displays the Admin's designated corporate bank account details, and enables the Admin to click **"Confirm & Credit"** to trigger an **Ethers.js Treasury Payout** directly to the user's connected wallet (`completed`).

### 3. Sell Crypto Workflow (`Crypto -> Fiat`)
- **On-Chain USDT Transfer:** Calculates fiat payout using the live **Admin-set Sell Rate**, collects user bank payout details (`Bank Name`, `Account Number`, `Account Name`), and triggers a Web3 transaction (`executeUsdtSellTransfer`) sending USDT directly to the Admin's Treasury Wallet.
- **TxHash Capture & Verification:** Captures the transaction hash (`txHash`), stores the order as `pending_fiat_payout`, and lets the Admin verify the hash on-chain before executing the corporate bank transfer and marking the order `completed`.

### 4. Admin Dashboard & Dynamic Rate Control (`/admin`)
- **Rate Management Panel:** Instant updates to **Buy Rate**, **Sell Rate**, markup spreads, corporate bank details, and Treasury EVM wallet address.
- **Transaction Settlement Queue:** Searchable, filterable queue with `Approve`, `Confirm & Credit` (Ethers.js payout), `Mark Completed`, and `Reject` actions.
- **Live Security & Settlement Audit Logs:** Chronological tracking of all user submissions, multi-channel notification dispatches, and admin overrides.

### 5. Multi-Channel Notification Engine
Whenever a new Buy or Sell order is submitted, `dispatchMultiChannelOrderNotification` (`src/lib/notifications.ts`) concurrently dispatches:
1. **Admin Dashboard Notification:** Real-time unread badge counter and floating toast alert inside `/admin`.
2. **Automated Email Notification:** HTML transactional alert via **Resend** (`RESEND_API_KEY`) or **SendGrid** (`SENDGRID_API_KEY`).
3. **Telegram Bot Notification:** Formatted Markdown alert sent via `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/sendMessage` to `TELEGRAM_ADMIN_CHAT_ID`.

---

## Quick Start

```bash
# 1. Push Prisma SQL schema
npx prisma db push

# 2. Start development server
npm run dev
```
Open `http://localhost:3000` for the **User OTC Exchange Desk** and `http://localhost:3000/admin` for the **Admin Treasury Console**.
