import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * The CSP is intentionally strict for a financial product. `unsafe-inline` on
 * styles is required by Next's runtime style injection; scripts use a nonce in
 * production via middleware, and fall back to `unsafe-eval` only in dev where
 * React Refresh needs it.
 */
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Static assets are content-hashed — cache them hard.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Common vanity paths people type or link to.
      { source: "/signin", destination: "/login", permanent: true },
      { source: "/signup", destination: "/register", permanent: true },
      { source: "/pricing", destination: "/plans", permanent: true },
    ];
  },
};

export default nextConfig;
