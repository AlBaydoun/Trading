/**
 * Single source of truth for brand, contact and SEO defaults.
 *
 * Rename the whole product by editing `name` and `legalName` here — every page
 * title, structured-data block, email template and footer reads from this file.
 */

export const LOCALES = ["en"] as const;

/**
 * Languages queued for rollout. Move an entry from here into `LOCALES` and drop
 * a matching dictionary into `src/lib/i18n/dictionaries/` to switch it on —
 * routing, hreflang tags and the sitemap all pick it up automatically.
 */
export const PLANNED_LOCALES = ["ar", "ru", "de", "fr"] as const;

export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Locales that read right-to-left. Used for `dir` and layout mirroring. */
export const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

export const LOCALE_LABELS: Record<string, { native: string; english: string }> = {
  en: { native: "English", english: "English" },
  ar: { native: "العربية", english: "Arabic" },
  ru: { native: "Русский", english: "Russian" },
  de: { native: "Deutsch", english: "German" },
  fr: { native: "Français", english: "French" },
};

function resolveBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "Axiom Capital",
  shortName: "Axiom",
  legalName: "Axiom Capital Markets Ltd.",
  tagline: "Managed exposure to crypto and equity markets",
  description:
    "Axiom Capital gives investors managed, risk-controlled exposure to cryptocurrency and global equity markets. Track every position, every fee and every basis point of performance in one account.",
  url: resolveBaseUrl(),
  locale: DEFAULT_LOCALE,

  founded: "2024",
  registration: "Company No. 00000000",
  jurisdiction: "To be completed on incorporation",

  contact: {
    email: "invest@axiomcapital.example",
    support: "support@axiomcapital.example",
    compliance: "compliance@axiomcapital.example",
    phone: "+1 (000) 000-0000",
    address: {
      street: "1 Exchange Square",
      city: "London",
      region: "England",
      postalCode: "EC2A 2EH",
      country: "GB",
    },
  },

  social: {
    x: "https://x.com/",
    linkedin: "https://www.linkedin.com/",
    telegram: "https://t.me/",
    youtube: "https://www.youtube.com/",
  },

  /** Used for JSON-LD `sameAs` and the footer. Empty strings are filtered out. */
  get sameAs(): string[] {
    return Object.values(this.social).filter(Boolean);
  },

  seo: {
    titleTemplate: "%s · Axiom Capital",
    defaultTitle:
      "Axiom Capital · Managed Crypto & Stock Market Investing",
    keywords: [
      "crypto investment platform",
      "managed cryptocurrency portfolio",
      "stock market investing",
      "digital asset management",
      "bitcoin investment account",
      "equity and crypto portfolio",
      "regulated investment platform",
      "passive trading income",
    ],
    twitterHandle: "@axiomcapital",
    ogImageAlt: "Axiom Capital — managed crypto and equity investing",
  },
} as const;

export type SiteConfig = typeof siteConfig;

/** Absolute URL builder — required for canonical tags, OG images and sitemaps. */
export function absoluteUrl(path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${clean === "/" ? "" : clean}`;
}

/**
 * Locale-aware path. The default locale is served unprefixed so `/markets`
 * stays the canonical English URL and `/de/markets` is the German one.
 */
export function localizedPath(path: string, locale: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return `/${locale}${clean === "/" ? "" : clean}`;
}
