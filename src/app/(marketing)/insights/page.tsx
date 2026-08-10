import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/money";
import { buildMetadata, JsonLd, breadcrumbSchema } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = buildMetadata({
  title: "Insights — Investment Research & Education",
  description:
    "Practical writing on risk, portfolio structure, custody and the arithmetic behind investment returns. Written by the people running the mandates. No price predictions.",
  path: "/insights",
  keywords: [
    "crypto investment research",
    "portfolio allocation guide",
    "investment education",
    "risk management investing",
  ],
});

export const revalidate = 1800;

interface PageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function InsightsPage({ searchParams }: PageProps) {
  const { category, q } = await searchParams;

  const posts = await prisma.post.findMany({
    where: {
      published: true,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { excerpt: { contains: q, mode: "insensitive" } },
              { tags: { has: q.toLowerCase() } },
            ],
          }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      tags: true,
      authorName: true,
      authorRole: true,
      publishedAt: true,
      readingMinutes: true,
    },
  });

  const categories = await prisma.post.groupBy({
    by: ["category"],
    where: { published: true },
    _count: { category: true },
    orderBy: { _count: { category: "desc" } },
  });

  const [featured, ...rest] = posts;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Insights", path: "/insights" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            "@id": absoluteUrl("/insights#blog"),
            name: "Axiom Capital Insights",
            url: absoluteUrl("/insights"),
            publisher: { "@id": absoluteUrl("/#organization") },
            blogPost: posts.slice(0, 10).map((post) => ({
              "@type": "BlogPosting",
              headline: post.title,
              description: post.excerpt,
              url: absoluteUrl(`/insights/${post.slug}`),
              datePublished: post.publishedAt?.toISOString(),
              author: { "@type": "Person", name: post.authorName },
            })),
          },
        ]}
      />

      <Section className="pt-36 md:pt-44">
        <SectionHeading
          eyebrow="Insights"
          title="Research worth the reading time."
          description="Notes on how portfolios actually behave — position sizing, custody structure, fee arithmetic and the behavioural traps that cost more than any of them. Nothing here predicts a price."
        />

        <Reveal className="mt-10 flex flex-wrap items-center gap-2">
          <Link
            href="/insights"
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
              !category
                ? "border-brand/50 bg-brand/12 text-brand-bright"
                : "border-line-bright text-ink-muted hover:text-ink"
            }`}
          >
            All ({posts.length})
          </Link>
          {categories.map((item) => (
            <Link
              key={item.category}
              href={`/insights?category=${encodeURIComponent(item.category)}`}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
                category === item.category
                  ? "border-brand/50 bg-brand/12 text-brand-bright"
                  : "border-line-bright text-ink-muted hover:text-ink"
              }`}
            >
              {item.category} ({item._count.category})
            </Link>
          ))}
        </Reveal>

        {posts.length === 0 ? (
          <EmptyState
            className="mt-16"
            title="Nothing matches that filter"
            description="Try a different category, or browse everything."
            action={
              <Link href="/insights" className="text-brand-bright hover:text-mint">
                View all articles
              </Link>
            }
          />
        ) : (
          <>
            {featured && (
              <Reveal className="mt-12">
                <article className="panel group relative overflow-hidden p-8 transition-colors hover:border-brand/40 md:p-12">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                      background:
                        "radial-gradient(ellipse 60% 100% at 85% 0%, rgba(91,140,255,0.14) 0%, transparent 60%)",
                    }}
                  />
                  <div className="relative max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge tone="brand">{featured.category}</Badge>
                      <span className="text-[12.5px] text-ink-faint">
                        Latest
                      </span>
                    </div>

                    <h2 className="mt-5 font-display text-3xl font-semibold leading-[1.12] tracking-tight text-ink transition-colors group-hover:text-brand-bright md:text-[40px]">
                      <Link href={`/insights/${featured.slug}`}>
                        <span className="absolute inset-0" />
                        {featured.title}
                      </Link>
                    </h2>

                    <p className="mt-5 text-[16.5px] leading-relaxed text-ink-muted">
                      {featured.excerpt}
                    </p>

                    <div className="mt-7 flex flex-wrap items-center gap-2 text-[13px] text-ink-faint">
                      <span className="text-ink-muted">{featured.authorName}</span>
                      {featured.authorRole && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{featured.authorRole}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <time dateTime={featured.publishedAt?.toISOString()}>
                        {formatDate(featured.publishedAt, "long")}
                      </time>
                      <span aria-hidden="true">·</span>
                      <span>{featured.readingMinutes} min read</span>
                    </div>
                  </div>
                </article>
              </Reveal>
            )}

            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post, index) => (
                <Reveal key={post.slug} delay={(index % 3) * 0.07}>
                  <article className="panel group relative flex h-full flex-col p-6 transition-colors hover:border-line-bright">
                    <Badge tone="outline" className="w-fit">
                      {post.category}
                    </Badge>

                    <h2 className="mt-4 font-display text-[19px] font-semibold leading-snug text-ink transition-colors group-hover:text-brand-bright">
                      <Link href={`/insights/${post.slug}`}>
                        <span className="absolute inset-0" />
                        {post.title}
                      </Link>
                    </h2>

                    <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink-muted">
                      {post.excerpt}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-6 text-[12px] text-ink-faint">
                      <span>{post.authorName}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={post.publishedAt?.toISOString()}>
                        {formatDate(post.publishedAt)}
                      </time>
                      <span aria-hidden="true">·</span>
                      <span>{post.readingMinutes} min</span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section className="border-t border-line">
        <Reveal>
          <div className="panel flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-12">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-semibold text-ink">
                Follow the research
              </h2>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-muted">
                New notes are published as the desk writes them — usually every
                week or two. The RSS feed carries the full list.
              </p>
            </div>
            <a
              href="/feed.xml"
              className="shrink-0 rounded-xl border border-line-bright px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:border-brand/60 hover:bg-brand/8"
            >
              Subscribe via RSS
            </a>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
