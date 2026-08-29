import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  // Staging and preview deployments must never be indexed — one accidental
  // crawl of a preview URL competes with production for the same content.
  //
  // Order matters here. A Vercel preview is served over https just like
  // production, so the https check alone would wave every preview through;
  // VERCEL_ENV has to be consulted first and treated as authoritative.
  const vercelEnv = process.env.VERCEL_ENV;

  const isProduction = vercelEnv
    ? vercelEnv === "production"
    : process.env.NODE_ENV === "production" &&
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
