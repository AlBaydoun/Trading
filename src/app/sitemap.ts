import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, localizedPath, LOCALES, DEFAULT_LOCALE } from "@/lib/site-config";

export const revalidate = 3600;

/**
 * Generated from the database, not hand-maintained, so a new article or plan
 * appears without anyone remembering to add it. Private routes (/dashboard,
 * /admin, /api) are excluded here and blocked in robots.ts.
 */

type Entry = MetadataRoute.Sitemap[number];

function entry(
  path: string,
  options: {
    lastModified?: Date;
    changeFrequency?: Entry["changeFrequency"];
    priority?: number;
  } = {},
): Entry {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = absoluteUrl(localizedPath(path, locale));
  }

  return {
    url: absoluteUrl(localizedPath(path, DEFAULT_LOCALE)),
    lastModified: options.lastModified ?? new Date(),
    changeFrequency: options.changeFrequency ?? "weekly",
    priority: options.priority ?? 0.6,
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The static pages below are the part that must never be missing. If the
  // database is unreachable, serve those rather than returning a 500 and
  // leaving search engines with no sitemap at all.
  let plans: { slug: string; updatedAt: Date }[] = [];
  let posts: { slug: string; updatedAt: Date; publishedAt: Date | null }[] = [];

  try {
    [plans, posts] = await Promise.all([
      prisma.investmentPlan.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.post.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: "desc" },
      }),
    ]);
  } catch {
    console.warn("[sitemap] database unavailable — serving static routes only");
  }

  const staticPages: Entry[] = [
    entry("/", { changeFrequency: "daily", priority: 1 }),
    entry("/plans", { changeFrequency: "weekly", priority: 0.9 }),
    entry("/markets", { changeFrequency: "hourly", priority: 0.85 }),
    entry("/how-it-works", { priority: 0.8 }),
    entry("/security", { priority: 0.75 }),
    entry("/about", { priority: 0.7 }),
    entry("/faq", { priority: 0.7 }),
    entry("/contact", { priority: 0.65 }),
    entry("/insights", { changeFrequency: "daily", priority: 0.8 }),
    entry("/register", { priority: 0.6 }),
    entry("/login", { priority: 0.4, changeFrequency: "yearly" }),
    entry("/legal/terms", { changeFrequency: "yearly", priority: 0.3 }),
    entry("/legal/privacy", { changeFrequency: "yearly", priority: 0.3 }),
    entry("/legal/risk-disclosure", { changeFrequency: "yearly", priority: 0.45 }),
    entry("/legal/aml", { changeFrequency: "yearly", priority: 0.3 }),
    entry("/legal/fees", { changeFrequency: "monthly", priority: 0.6 }),
    entry("/legal/cookies", { changeFrequency: "yearly", priority: 0.2 }),
  ];

  const planPages = plans.map((plan) =>
    entry(`/plans/${plan.slug}`, {
      lastModified: plan.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const postPages = posts.map((post) =>
    entry(`/insights/${post.slug}`, {
      lastModified: post.updatedAt ?? post.publishedAt ?? new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  );

  return [...staticPages, ...planPages, ...postPages];
}
