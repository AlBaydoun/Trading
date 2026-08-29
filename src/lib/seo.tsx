import type { Metadata } from "next";
import {
  DEFAULT_LOCALE,
  LOCALES,
  absoluteUrl,
  localizedPath,
  siteConfig,
} from "@/lib/site-config";

/**
 * Every page builds its metadata through `buildMetadata`. Centralising it means
 * canonical URLs, hreflang, Open Graph and Twitter cards can never drift apart,
 * and adding a locale updates every page's alternates at once.
 */

export interface PageSeo {
  title: string;
  description: string;
  path: string;
  /** Overrides the generated OG image. */
  image?: string;
  keywords?: string[];
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  /** Set on thin, paginated or duplicate surfaces. */
  noIndex?: boolean;
}

function alternateLanguages(path: string): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of LOCALES) {
    alternates[locale] = absoluteUrl(localizedPath(path, locale));
  }
  // Tells search engines which URL to serve when no language matches.
  alternates["x-default"] = absoluteUrl(localizedPath(path, DEFAULT_LOCALE));
  return alternates;
}

export function buildMetadata(seo: PageSeo): Metadata {
  const url = absoluteUrl(seo.path);
  const ogImage =
    seo.image ??
    absoluteUrl(`/api/og?title=${encodeURIComponent(seo.title)}`);

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords ?? [...siteConfig.seo.keywords],
    alternates: {
      canonical: url,
      languages: alternateLanguages(seo.path),
    },
    robots: seo.noIndex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      type: seo.type ?? "website",
      url,
      title: seo.title,
      description: seo.description,
      siteName: siteConfig.name,
      locale: "en_US",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ],
      ...(seo.type === "article"
        ? {
            publishedTime: seo.publishedTime,
            modifiedTime: seo.modifiedTime,
            authors: seo.authors,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [ogImage],
      site: siteConfig.seo.twitterHandle,
      creator: siteConfig.seo.twitterHandle,
    },
  };
}

// ---------------------------------------------------------------------------
// Structured data (JSON-LD)
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

export function organizationSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "@id": absoluteUrl("/#organization"),
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteConfig.url,
    logo: absoluteUrl("/icon.svg"),
    image: absoluteUrl("/api/og"),
    description: siteConfig.description,
    slogan: siteConfig.tagline,
    foundingDate: siteConfig.founded,
    email: siteConfig.contact.email,
    telephone: siteConfig.contact.phone,
    sameAs: siteConfig.sameAs,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.contact.address.street,
      addressLocality: siteConfig.contact.address.city,
      addressRegion: siteConfig.contact.address.region,
      postalCode: siteConfig.contact.address.postalCode,
      addressCountry: siteConfig.contact.address.country,
    },
    areaServed: "Worldwide",
    serviceType: [
      "Investment management",
      "Multi-asset portfolio management",
      "Cryptocurrency portfolio management",
      "Equity portfolio management",
      "Foreign exchange and commodities management",
      "Fixed income and real asset management",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: siteConfig.contact.support,
        availableLanguage: ["English"],
      },
      {
        "@type": "ContactPoint",
        contactType: "compliance",
        email: siteConfig.contact.compliance,
      },
    ],
  };
}

export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/insights?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(
  items: { name: string; path: string }[],
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqSchema(items: { question: string; answer: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function articleSchema(article: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt: string;
  authorName: string;
  authorRole?: string | null;
  image?: string;
  tags?: string[];
  wordCount?: number;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": absoluteUrl(`/insights/${article.slug}#article`),
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "en",
    wordCount: article.wordCount,
    keywords: article.tags?.join(", "),
    image: article.image ?? absoluteUrl(`/api/og?title=${encodeURIComponent(article.title)}`),
    author: {
      "@type": "Person",
      name: article.authorName,
      jobTitle: article.authorRole ?? undefined,
      worksFor: { "@id": absoluteUrl("/#organization") },
    },
    publisher: { "@id": absoluteUrl("/#organization") },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/insights/${article.slug}`),
    },
  };
}

export function productSchema(plan: {
  name: string;
  slug: string;
  description: string;
  minimumAmount: number;
  riskLevel: string;
  targetApyLow: number;
  targetApyHigh: number;
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "@id": absoluteUrl(`/plans/${plan.slug}#product`),
    name: plan.name,
    description: plan.description,
    url: absoluteUrl(`/plans/${plan.slug}`),
    provider: { "@id": absoluteUrl("/#organization") },
    category: "Investment portfolio",
    feesAndCommissionsSpecification: absoluteUrl("/legal/fees"),
    interestRate: {
      "@type": "QuantitativeValue",
      minValue: plan.targetApyLow,
      maxValue: plan.targetApyHigh,
      unitText: "PERCENT",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: plan.minimumAmount,
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: plan.minimumAmount,
        priceCurrency: "USD",
      },
    },
  };
}

/**
 * Renders a JSON-LD block. `dangerouslySetInnerHTML` is the documented way to
 * emit structured data in Next; the payload is our own serialised object and
 * `<` is escaped so a string value can never break out of the script tag.
 */
export function JsonLd({ data }: { data: Json | Json[] }) {
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  );
}
