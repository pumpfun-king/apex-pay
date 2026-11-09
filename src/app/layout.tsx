import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cryptohive.exchange";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "Cryptohive | #1 Instant Web3 OTC Crypto Exchange — Buy & Sell USDT with Zero Fees",
    template: "%s | Cryptohive DeFi Crypto Exchange",
  },
  description:
    "Cryptohive is the premier institutional & retail Web3 DeFi crypto exchange. Buy Crypto and Sell USDT (ERC-20, BEP-20, Polygon, Arbitrum) with instant bank transfers, live NGN/USD rates, $1 minimum trades, 0% desk fees, and automated Ethers.js treasury settlement.",
  applicationName: "Cryptohive DeFi Exchange",
  authors: [{ name: "Cryptohive Treasury & Web3 DeFi Desk", url: SITE_URL }],
  generator: "Next.js",
  keywords: [
    "Cryptohive",
    "Cryptohive DeFi",
    "Cryptohive Exchange",
    "Buy Crypto",
    "Sell USDT",
    "Buy USDT",
    "Sell Crypto for Cash",
    "USDT to NGN",
    "NGN to USDT",
    "Buy USDT in Nigeria",
    "Sell USDT for Naira Instantly",
    "OTC Crypto Exchange",
    "Web3 OTC Desk",
    "Instant Crypto Settlement",
    "Fiat to Crypto On-Ramp",
    "Crypto to Fiat Off-Ramp",
    "Tether USDT Exchange",
    "ERC20 USDT OTC",
    "BEP20 USDT OTC",
    "Polygon USDT Exchange",
    "Arbitrum USDT Exchange",
    "Zero Fee Crypto Exchange",
    "Non-Custodial Web3 Exchange",
    "Instant Bank Transfer Crypto",
    "Best Site to Buy and Sell USDT",
    "Fastest Crypto to Bank Payout",
    "DeFi OTC Liquidity Desk",
    "P2P Alternative Instant Crypto",
  ],
  referrer: "origin-when-cross-origin",
  creator: "Cryptohive",
  publisher: "Cryptohive Digital Assets Ltd.",
  category: "Finance, Cryptocurrency, Web3, OTC Exchange, FinTech",
  classification: "Cryptocurrency Exchange & Web3 OTC Settlement Platform",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "en-NG": "/",
      "en-GB": "/",
      "x-default": "/",
    },
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/logo.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: ["/logo.svg", "/logo.png"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/logo.svg",
        color: "#FFC700",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Cryptohive DeFi Crypto Exchange",
    title:
      "Cryptohive | Instant Web3 DeFi Crypto Exchange — Buy & Sell USDT Instantly",
    description:
      "Trade USDT to Fiat and Fiat to USDT in seconds. Connect MetaMask, Trust Wallet, Coinbase, or Rabby for instant Ethers.js smart treasury settlement across Ethereum, BNB Chain, Polygon, and Arbitrum with 0% OTC fees.",
    images: [
      {
        url: "/og-image.png",
        width: 1500,
        height: 1500,
        alt: "Cryptohive — The World Class Digital Asset & Web3 OTC Exchange",
        type: "image/png",
      },
      {
        url: "/logo.svg",
        width: 70,
        height: 70,
        alt: "Cryptohive Official Logo",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Cryptohive | Instant Web3 OTC Crypto Exchange — Buy & Sell USDT",
    description:
      "Buy Crypto & Sell USDT with instant bank payouts, live locked quotes, $1 minimum order, and 0% desk fees across Ethereum, BNB Chain, Polygon & Arbitrum.",
    creator: "@crypt0hive",
    site: "@crypt0hive",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cryptohive",
    startupImage: ["/logo.png"],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "ai-content-declaration":
      "Cryptohive is a verified Web3 OTC cryptocurrency exchange for buying and selling USDT (Tether) with instant bank transfer settlement across Ethereum (ERC-20), BNB Chain (BEP-20), Polygon, and Arbitrum.",
    "llms-txt": `${SITE_URL}/llms.txt`,
    "ai-plugin": `${SITE_URL}/llms.txt`,
    "revisit-after": "1 days",
    rating: "General",
    distribution: "Global",
    coverage: "Worldwide",
    target: "all",
    HandheldFriendly: "True",
    MobileOptimized: "320",
    "msapplication-TileImage": "/logo.png",
    "msapplication-TileColor": "#FFFFFF",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#FFFFFF" },
  ],
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FinancialService",
      "@id": `${SITE_URL}/#organization`,
      name: "Cryptohive",
      alternateName: ["Cryptohive DeFi", "Cryptohive Crypto Exchange", "Cryptohive Web3 DeFi Desk"],
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
        contentUrl: `${SITE_URL}/logo.svg`,
        width: 1500,
        height: 1500,
        caption: "Cryptohive Official Logo",
      },
      image: `${SITE_URL}/og-image.png`,
      description:
        "Cryptohive is a world-class Web3 DeFi cryptocurrency exchange enabling instant Buy Crypto (Fiat-to-USDT) and Sell USDT (USDT-to-Fiat) transactions with zero fees, $1 minimum trades, automated Ethers.js treasury payouts, and instant bank settlement.",
      priceRange: "$1 - $5,000,000",
      currenciesAccepted: "USDT, ETH, BNB, MATIC, NGN, USD, GBP, EUR",
      paymentAccepted: "Bank Transfer, Instant Wire, Cryptocurrency, USDT ERC-20, USDT BEP-20, Polygon USDT, Arbitrum USDT",
      areaServed: "Worldwide",
      openingHours: "Mo-Su 00:00-23:59",
      knowsAbout: [
        "Buy Crypto",
        "Sell USDT",
        "DeFi Cryptocurrency Trading",
        "USDT to Bank Account Settlement",
        "Fiat to USDT On-Ramp",
        "Ethereum ERC-20 USDT",
        "BNB Smart Chain BEP-20 USDT",
        "Polygon POS USDT",
        "Arbitrum One USDT",
        "Web3 Non-Custodial Wallet Settlement",
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Cryptohive DeFi Trading Services",
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Buy Crypto / Buy USDT with Bank Transfer",
              description:
                "Convert local fiat currency (NGN/USD) into USDT delivered directly to your connected Web3 wallet or wallet address with an auto-generated unique payment reference for rapid confirmation.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Sell USDT for Instant Bank Payout",
              description:
                "Sell USDT from MetaMask, Trust Wallet, Coinbase Wallet, or Rabby directly to the Cryptohive Treasury and receive instant bank account settlement with 0% fee.",
            },
          },
        ],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Cryptohive DeFi Crypto Exchange",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#webapp`,
      name: "Cryptohive Exchange",
      url: SITE_URL,
      applicationCategory: "FinanceApplication",
      operatingSystem: "All (Web, iOS, Android, Web3 Browsers)",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "0% OTC Platform Fee on Buy Crypto and Sell USDT trades starting from $5.00.",
      },
      featureList: [
        "Instant Buy USDT with unique auto-generated bank transfer reference code",
        "Instant Sell USDT with direct Web3 wallet ERC-20 signing",
        "Multi-chain support: Ethereum (ERC-20), BNB Chain (BEP-20), Polygon, Arbitrum",
        "Live NGN/USD OTC exchange rate calculator",
        "Downloadable PNG & Printable PDF Official Transaction Receipts",
        "Automated Ethers.js Treasury Payouts",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Cryptohive and how does it work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Cryptohive is an instant Web3 OTC cryptocurrency exchange where users can buy crypto (Fiat to USDT) and sell USDT (USDT to bank account) with live locked quotes, $5 minimum order size, 0% OTC desk fee, and instant verification.",
          },
        },
        {
          "@type": "Question",
          name: "Which blockchain networks does Cryptohive support for buying and selling USDT?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Cryptohive supports Tether (USDT) across Ethereum Mainnet (ERC-20), BNB Smart Chain (BEP-20), Polygon POS, and Arbitrum One.",
          },
        },
        {
          "@type": "Question",
          name: "How fast is payment confirmation when buying or selling USDT on Cryptohive?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Every Buy order generates a unique, one-time payment reference code (e.g., CHV-BXXXXXX) to include in your bank transfer narration for automated instant confirmation and Ethers.js smart treasury USDT dispatch.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#FFFFFF" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="msapplication-navbutton-color" content="#FFFFFF" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="image_src" href="/og-image.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-screen bg-[#EEF0F4] text-[#0A0B0E] antialiased selection:bg-[#FFC700]/40 selection:text-black">
        {children}
      </body>
    </html>
  );
}
