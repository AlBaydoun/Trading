import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  // Staging and preview deployments must never be indexed — one accidental
  // crawl of a preview URL competes with production for the same content.
  const isProduction =
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV) ||
    siteConfig.url.startsWith("https://");

  if (!isProduction) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: absoluteUrl("/sitemap.xml"),
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/admin",
          "/admin/",
          "/login",
          "/*?next=",
          "/uploads/",
        ],
      },
      {
        // Crawl budget: the market board changes constantly and has no unique
        // long-form content worth re-fetching every few minutes.
        userAgent: "AhrefsBot",
        crawlDelay: 10,
        allow: "/",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
