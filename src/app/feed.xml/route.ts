import { prisma } from "@/lib/prisma";
import { absoluteUrl, siteConfig } from "@/lib/site-config";

export const revalidate = 3600;

/** Escapes the five characters that are not legal as raw text in XML. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  // An empty feed is a valid feed; a 500 is not. Readers poll this endpoint on
  // a schedule and handle "no items" gracefully.
  let posts: {
    slug: string;
    title: string;
    excerpt: string;
    publishedAt: Date | null;
    authorName: string;
    category: string;
    tags: string[];
  }[] = [];

  try {
    posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 40,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        authorName: true,
        category: true,
        tags: true,
      },
    });
  } catch {
    console.warn("[feed] database unavailable — serving an empty feed");
  }

  const updated = posts[0]?.publishedAt ?? new Date();

  const items = posts
    .map(
      (post) => `    <item>
      <title>${xml(post.title)}</title>
      <link>${absoluteUrl(`/insights/${post.slug}`)}</link>
      <guid isPermaLink="true">${absoluteUrl(`/insights/${post.slug}`)}</guid>
      <description>${xml(post.excerpt)}</description>
      <pubDate>${(post.publishedAt ?? new Date()).toUTCString()}</pubDate>
      <dc:creator>${xml(post.authorName)}</dc:creator>
      <category>${xml(post.category)}</category>
${post.tags.map((tag) => `      <category>${xml(tag)}</category>`).join("\n")}
    </item>`,
    )
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xml(siteConfig.name)} — Insights</title>
    <link>${absoluteUrl("/insights")}</link>
    <description>${xml(siteConfig.description)}</description>
    <language>en</language>
    <lastBuildDate>${updated.toUTCString()}</lastBuildDate>
    <atom:link href="${absoluteUrl("/feed.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
