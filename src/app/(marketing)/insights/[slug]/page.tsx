import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/money";
import { Markdown, extractHeadings } from "@/lib/markdown";
import {
  buildMetadata,
  JsonLd,
  articleSchema,
  breadcrumbSchema,
} from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { Section } from "@/components/marketing/section";
import { Badge, Panel } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 1800;

export async function generateStaticParams() {
  // See the note in plans/[slug]: prerendering is an optimisation, so a
  // database that is not ready at build time must not fail the build.
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      select: { slug: true },
    });
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    console.warn("[build] posts unavailable — rendering articles on demand");
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug } });

  if (!post || !post.published) {
    return buildMetadata({
      title: "Article not found",
      description: "This article is no longer available.",
      path: `/insights/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    path: `/insights/${post.slug}`,
    type: "article",
    keywords: post.tags,
    authors: [post.authorName],
    publishedTime: post.publishedAt?.toISOString(),
    modifiedTime: post.updatedAt.toISOString(),
    image: `/api/og?title=${encodeURIComponent(post.title)}&eyebrow=${encodeURIComponent(post.category)}&badge=${encodeURIComponent(`${post.readingMinutes} min read`)}`,
  });
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post || !post.published) notFound();

  const related = await prisma.post.findMany({
    where: {
      published: true,
      id: { not: post.id },
      OR: [{ category: post.category }, { tags: { hasSome: post.tags } }],
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      readingMinutes: true,
    },
  });

  const headings = extractHeadings(post.content);
  const wordCount = post.content.split(/\s+/).length;

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            title: post.title,
            description: post.seoDescription ?? post.excerpt,
            slug: post.slug,
            publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            authorName: post.authorName,
            authorRole: post.authorRole,
            tags: post.tags,
            wordCount,
            image: absoluteUrl(
              `/api/og?title=${encodeURIComponent(post.title)}&eyebrow=${encodeURIComponent(post.category)}`,
            ),
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Insights", path: "/insights" },
            { name: post.title, path: `/insights/${post.slug}` },
          ]),
        ]}
      />

      <Section className="pt-36 md:pt-44">
        <Link
          href="/insights"
          className="inline-flex items-center gap-2 text-[13.5px] text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          All insights
        </Link>

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-16">
          <article className="min-w-0 max-w-3xl">
            <header>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="brand">{post.category}</Badge>
                <span className="text-[13px] text-ink-faint">
                  {post.readingMinutes} min read
                </span>
              </div>

              <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-ink md:text-[52px]">
                {post.title}
              </h1>

              <p className="mt-6 text-[19px] leading-relaxed text-ink-muted">
                {post.excerpt}
              </p>

              <div className="mt-8 flex items-center gap-4 border-y border-line py-5">
                <span
                  className="flex size-11 items-center justify-center rounded-full border border-line-bright bg-surface-2 font-display text-[14px] font-semibold text-brand-bright"
                  aria-hidden="true"
                >
                  {post.authorName.split(" ").map((n) => n[0]).join("")}
                </span>
                <div className="text-[13.5px]">
                  <p className="font-medium text-ink">{post.authorName}</p>
                  <p className="text-ink-faint">
                    {post.authorRole}
                    {post.authorRole && " · "}
                    <time dateTime={post.publishedAt?.toISOString()}>
                      {formatDate(post.publishedAt, "long")}
                    </time>
                  </p>
                </div>
              </div>
            </header>

            <div className="mt-2">
              <Markdown content={post.content} />
            </div>

            {post.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap gap-2 border-t border-line pt-8">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/insights?q=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-line-bright px-3 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:border-brand/50 hover:text-brand-bright"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            <Panel className="mt-10 p-6">
              <p className="text-[13px] leading-relaxed text-ink-muted">
                <strong className="text-ink">This is general information.</strong>{" "}
                It is not personal financial advice and does not take your
                circumstances into account. Investing puts your capital at risk
                and you may get back less than you put in. If you are unsure,
                seek independent advice.
              </p>
            </Panel>
          </article>

          {/* ------------------------------------------ table of contents --- */}
          {headings.length > 2 && (
            <aside className="hidden lg:block">
              <nav
                className="sticky top-28"
                aria-label="On this page"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  On this page
                </p>
                <ul className="mt-4 space-y-2.5 border-l border-line">
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <a
                        href={`#${heading.id}`}
                        className={`-ml-px block border-l border-transparent pl-4 text-[13px] leading-snug text-ink-muted transition-colors hover:border-brand hover:text-ink ${
                          heading.level === 3 ? "pl-7 text-[12.5px]" : ""
                        }`}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          )}
        </div>
      </Section>

      {related.length > 0 && (
        <Section className="border-t border-line bg-abyss">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Related reading
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {related.map((item) => (
              <Reveal key={item.slug}>
                <article className="panel group relative flex h-full flex-col p-6 transition-colors hover:border-brand/40">
                  <Badge tone="outline" className="w-fit">
                    {item.category}
                  </Badge>
                  <h3 className="mt-4 font-display text-[17px] font-semibold leading-snug text-ink transition-colors group-hover:text-brand-bright">
                    <Link href={`/insights/${item.slug}`}>
                      <span className="absolute inset-0" />
                      {item.title}
                    </Link>
                  </h3>
                  <p className="mt-2.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-muted">
                    {item.excerpt}
                  </p>
                  <span className="mt-auto flex items-center gap-1.5 pt-5 text-[12.5px] text-ink-faint">
                    {item.readingMinutes} min read
                    <ArrowUpRight className="size-3.5" />
                  </span>
                </article>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      <Section className="border-t border-line">
        <div className="panel flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-12">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold text-ink">
              Put the ideas to work
            </h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-muted">
              Five mandates, each with its allocation, fees and expected drawdown
              published before you commit a dollar.
            </p>
          </div>
          <ButtonLink href="/plans" size="lg" className="shrink-0">
            Compare the mandates
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
