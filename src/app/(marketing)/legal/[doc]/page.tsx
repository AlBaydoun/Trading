import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Scale, TriangleAlert } from "lucide-react";
import { LEGAL_DOCS, getLegalDoc } from "@/lib/content/legal";
import { Markdown, extractHeadings } from "@/lib/markdown";
import { formatDate } from "@/lib/money";
import { buildMetadata, JsonLd, breadcrumbSchema } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { Section } from "@/components/marketing/section";
import { Alert, Panel } from "@/components/ui/primitives";

interface PageProps {
  params: Promise<{ doc: string }>;
}

export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ doc: doc.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { doc: slug } = await params;
  const doc = getLegalDoc(slug);

  if (!doc) {
    return buildMetadata({
      title: "Document not found",
      description: "This legal document does not exist.",
      path: `/legal/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: doc.title,
    description: doc.summary,
    path: `/legal/${doc.slug}`,
    image: `/api/og?title=${encodeURIComponent(doc.title)}&eyebrow=${encodeURIComponent("Legal")}`,
  });
}

export default async function LegalPage({ params }: PageProps) {
  const { doc: slug } = await params;
  const doc = getLegalDoc(slug);
  if (!doc) notFound();

  const headings = extractHeadings(doc.content);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: doc.title, path: `/legal/${doc.slug}` },
        ])}
      />

      <Section className="pt-36 md:pt-44">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-16">
          <article className="min-w-0 max-w-3xl">
            <div className="flex items-center gap-2 text-[13px] text-ink-faint">
              <Scale className="size-4" />
              <span>Legal</span>
              <span aria-hidden="true">·</span>
              <span>Last updated {formatDate(doc.updated, "long")}</span>
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink md:text-[48px] md:leading-[1.08]">
              {doc.title}
            </h1>
            <p className="mt-5 text-[18px] leading-relaxed text-ink-muted">
              {doc.summary}
            </p>

            {/*
              An unreviewed legal document on a live financial site is a real
              liability. The banner stays until `reviewed` is set to true in
              src/lib/content/legal.ts — deliberately hard to forget.
            */}
            {!doc.reviewed && (
              <Alert tone="gold" className="mt-8">
                <div className="flex gap-3">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <div className="text-[13.5px] leading-relaxed">
                    <p className="font-semibold text-gold">
                      Draft — pending legal review
                    </p>
                    <p className="mt-1">
                      This document was written to be specific and readable, but
                      it has not yet been reviewed by a qualified lawyer in the
                      operating jurisdiction. It must be before this platform
                      accepts real client funds.
                    </p>
                  </div>
                </div>
              </Alert>
            )}

            <div className="mt-6">
              <Markdown content={doc.content} />
            </div>

            <Panel className="mt-12 p-6">
              <p className="text-[13.5px] leading-relaxed text-ink-muted">
                Questions about this document? Email{" "}
                <a
                  href={`mailto:${siteConfig.contact.compliance}`}
                  className="text-brand-bright hover:text-mint"
                >
                  {siteConfig.contact.compliance}
                </a>
                . We respond within five business days.
              </p>
            </Panel>
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-8">
              {headings.length > 2 && (
                <nav aria-label="On this page">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    On this page
                  </p>
                  <ul className="mt-4 space-y-2.5 border-l border-line">
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          className="-ml-px block border-l border-transparent pl-4 text-[13px] leading-snug text-ink-muted transition-colors hover:border-brand hover:text-ink"
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              <nav aria-label="Other legal documents">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  All documents
                </p>
                <ul className="mt-4 space-y-2">
                  {LEGAL_DOCS.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/legal/${item.slug}`}
                        className={`block text-[13px] transition-colors ${
                          item.slug === doc.slug
                            ? "font-medium text-brand-bright"
                            : "text-ink-muted hover:text-ink"
                        }`}
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
