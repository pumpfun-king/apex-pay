import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://cryptohive.exchange";

  return {
    rules: [
      {
        userAgent: [
          "*",
          "Googlebot",
          "Googlebot-Image",
          "Bingbot",
          "DuckDuckBot",
          "Slurp",
          "Yandex",
          "Baiduspider",
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-Web",
          "anthropic-ai",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Applebot",
          "Applebot-Extended",
          "Meta-ExternalAgent",
          "FacebookBot",
          "Twitterbot",
          "LinkedInBot",
          "CCBot",
          "cohere-ai",
          "YouBot",
        ],
        allow: ["/", "/llms.txt", "/logo.svg", "/logo.png", "/og-image.png"],
        disallow: ["/api/admin/", "/admin/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
