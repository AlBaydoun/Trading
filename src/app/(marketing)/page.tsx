import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  FileCheck2,
  Landmark,
  LineChart as LineChartIcon,
  Lock,
  ScrollText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { prisma, safeQuery } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getPlatformTotals } from "@/lib/ledger";
import { getMarketSnapshot } from "@/lib/market/service";
import { toNumber, formatCompactMoney, formatPrice, formatDate } from "@/lib/money";
import { buildMetadata, JsonLd, faqSchema, breadcrumbSchema } from "@/lib/seo";
import { HOME_FAQ } from "@/lib/content/faq";
import { Hero } from "@/components/marketing/hero";
import {
  MarketTicker,
  MarketTickerSkeleton,
} from "@/components/marketing/market-ticker";
import { Section, SectionHeading } from "@/components/marketing/section";
import { PlanCard, type PlanCardData } from "@/components/marketing/plan-card";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { ButtonLink } from "@/components/ui/button";
import {
  Badge,
  Delta,
  Panel,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { Sparkline } from "@/components/ui/sparkline";
import { Reveal, RevealGroup, RevealItem, Parallax } from "@/components/motion/reveal";

export const metadata: Metadata = buildMetadata({
  title: "Managed Crypto & Stock Market Investing",
  description:
    "Axiom Capital builds and runs portfolios across cryptocurrency and global equity markets. One account, live position-level transparency, and a double-entry ledger you can audit line by line.",
  path: "/",
});

// The home page reads live balances and prices; revalidate rather than caching
// it at build time so the figures stay current without hitting the DB per view.
export const revalidate = 300;

/** Fallback for the totals block when the ledger cannot be read. */
const ZERO = new Prisma.Decimal(0);

export default async function HomePage() {
  // The home page is the single most costly page to have go down, and it is
  // rendered at build time on a first deploy — before migrations have run. Each
  // query degrades independently rather than taking the page with it.
  const [totals, investorCount, plans, market, posts] = await Promise.all([
    safeQuery(
      () => getPlatformTotals(),
      {
        assets: ZERO, liabilities: ZERO, income: ZERO, expenses: ZERO,
        netRevenue: ZERO, aum: ZERO,
      },
      "platform totals",
    ),
    safeQuery(
      () => prisma.user.count({ where: { role: "USER", status: "ACTIVE" } }),
      0,
      "investor count",
    ),
    safeQuery(
      () =>
        prisma.investmentPlan.findMany({
          where: { isActive: true },
          orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
          take: 3,
        }),
      [],
      "featured plans",
    ),
    getMarketSnapshot({ limit: 6, featuredOnly: true }),
    safeQuery(
      () =>
        prisma.post.findMany({
          where: { published: true },
          orderBy: { publishedAt: "desc" },
          take: 3,
          select: {
            slug: true,
            title: true,
            excerpt: true,
            category: true,
            publishedAt: true,
            readingMinutes: true,
            authorName: true,
          },
        }),
      [],
      "latest articles",
    ),
  ]);

  const planCards: PlanCardData[] = plans.map((plan) => ({
    slug: plan.slug,
    name: plan.name,
    tagline: plan.tagline,
    minimumAmount: toNumber(plan.minimumAmount),
    targetApyLow: toNumber(plan.targetApyLow),
    targetApyHigh: toNumber(plan.targetApyHigh),
    lockupDays: plan.lockupDays,
    riskLevel: plan.riskLevel,
    payoutFrequency: plan.payoutFrequency,
    highlights: plan.highlights,
    allocation: Array.isArray(plan.allocation)
      ? (plan.allocation as PlanCardData["allocation"])
      : [],
    isFeatured: plan.isFeatured,
  }));

  return (
    <>
      <JsonLd
        data={[
          faqSchema(HOME_FAQ.map((f) => ({ question: f.question, answer: f.answer }))),
          breadcrumbSchema([{ name: "Home", path: "/" }]),
        ]}
      />

      <Hero
        aum={formatCompactMoney(totals.aum)}
        investors={investorCount.toLocaleString("en-US")}
      />

      <Suspense fallback={<MarketTickerSkeleton />}>
        <MarketTicker />
      </Suspense>

      {/* ==================================================== how it works === */}
      <Section id="how-it-works">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps between opening an account and being invested."
          description="No relationship manager, no minimum-commitment call, no paperwork sent by post. The whole process runs in the browser and most accounts are funded the same day."
          action={
            <ButtonLink href="/how-it-works" variant="outline">
              Read the detail
              <ArrowRight className="size-4" />
            </ButtonLink>
          }
        />

        <RevealGroup className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: FileCheck2,
              step: "01",
              title: "Verify your identity",
              body: "Upload an ID and proof of address. Automated checks clear in minutes; anything ambiguous goes to a human the same day.",
            },
            {
              icon: Wallet,
              step: "02",
              title: "Fund the account",
              body: "Bank transfer in USD, EUR or GBP, or BTC, ETH and USDT. Funds are credited once operations matches the payment to your reference.",
            },
            {
              icon: LineChartIcon,
              step: "03",
              title: "Choose a mandate",
              body: "Five strategies from dollar income to concentrated growth. Fees, lock-up and expected drawdown are stated before you commit.",
            },
            {
              icon: ScrollText,
              step: "04",
              title: "Watch every line",
              body: "Positions, accruals, fees and running balances update in your dashboard. Export the full ledger whenever you want it.",
            },
          ].map((item) => (
            <RevealItem key={item.step}>
              <div className="group relative h-full bg-surface p-7 transition-colors duration-500 hover:bg-surface-2">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl border border-line-bright bg-void text-brand transition-colors duration-500 group-hover:border-brand/50 group-hover:text-mint">
                    <item.icon className="size-5" />
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-ink-faint">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-lg font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* ========================================================== plans === */}
      <Section className="border-y border-line bg-abyss">
        <SectionHeading
          eyebrow="Mandates"
          title="Five strategies. One account."
          description="Each mandate publishes its allocation, its fee schedule and the drawdown it is built to tolerate. Hold one or hold several — they settle into the same cash balance."
          action={
            <ButtonLink href="/plans" variant="outline">
              Compare all five
              <ArrowRight className="size-4" />
            </ButtonLink>
          }
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {planCards.map((plan, index) => (
            <Reveal key={plan.slug} delay={index * 0.08}>
              <PlanCard plan={plan} />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ======================================================== markets === */}
      <Section>
        <SectionHeading
          eyebrow="Live markets"
          title="The instruments behind the mandates."
          description="Prices refresh continuously from our market data providers. This board is the same feed the portfolio desk works from."
          action={
            <ButtonLink href="/markets" variant="outline">
              Full market board
              <ArrowRight className="size-4" />
            </ButtonLink>
          }
        />

        <Reveal className="mt-12">
          <Panel glow>
            <Table>
              <thead>
                <tr>
                  <Th>Asset</Th>
                  <Th align="right">Price</Th>
                  <Th align="right">24h</Th>
                  <Th align="right" className="hidden sm:table-cell">
                    7d
                  </Th>
                  <Th align="right" className="hidden md:table-cell">
                    Market cap
                  </Th>
                  <Th align="right">Trend</Th>
                </tr>
              </thead>
              <tbody>
                {market.quotes.map((quote) => (
                  <tr
                    key={quote.symbol}
                    id={quote.symbol}
                    className="transition-colors hover:bg-surface-2/60"
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-bright bg-surface-2 font-mono text-[10px] font-semibold text-ink-muted">
                          {quote.symbol.slice(0, 3)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">
                            {quote.name}
                          </span>
                          <span className="block font-mono text-[11px] text-ink-faint">
                            {quote.symbol}
                          </span>
                        </span>
                      </div>
                    </Td>
                    <Td align="right" mono>
                      {formatPrice(quote.price)}
                    </Td>
                    <Td align="right">
                      <Delta value={quote.change24hPct} />
                    </Td>
                    <Td align="right" className="hidden sm:table-cell">
                      <Delta value={quote.change7dPct} showArrow={false} />
                    </Td>
                    <Td align="right" mono className="hidden md:table-cell text-ink-muted">
                      {quote.marketCap
                        ? formatCompactMoney(quote.marketCap)
                        : "—"}
                    </Td>
                    <Td align="right">
                      <Sparkline
                        data={quote.sparkline}
                        id={quote.symbol}
                        className="ml-auto h-8 w-24"
                        positive={quote.change7dPct >= 0}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="flex items-center justify-between gap-4 px-5 py-3 text-[12px] text-ink-faint">
              <span>
                Prices are indicative and for information only — they are not
                dealing quotes.
              </span>
              <span className="font-mono">
                {market.source === "live" ? "Live" : "Cached"}
              </span>
            </div>
          </Panel>
        </Reveal>
      </Section>

      {/* ======================================================= platform === */}
      <Section className="overflow-hidden border-y border-line bg-abyss">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="The account"
              title="Every number, and where it came from."
              description="Most platforms show you a balance. Axiom shows you the journal entry behind it — the debit, the credit, the reference and the timestamp. If a figure moves, you can see exactly why."
            />

            <RevealGroup className="mt-10 space-y-5">
              {[
                {
                  title: "Double-entry from the ground up",
                  body: "Every movement posts a balanced entry. Balances are derived, never typed in, and the whole book reconciles to zero on demand.",
                },
                {
                  title: "Fees shown as lines, not as a footnote",
                  body: "Management, performance, early exit and withdrawal fees each appear as their own ledger line with the rate that produced them.",
                },
                {
                  title: "Exportable history",
                  body: "Download the complete transaction record as CSV at any time — for your accountant, your records, or your own arithmetic.",
                },
              ].map((item) => (
                <RevealItem key={item.title}>
                  <div className="flex gap-4">
                    <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md border border-mint/35 bg-mint/10 text-mint">
                      <svg viewBox="0 0 14 14" className="size-3" aria-hidden="true">
                        <path
                          d="M2.5 7.5 L5.5 10.5 L11.5 3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <div>
                      <h3 className="font-display text-[16px] font-semibold text-ink">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>

            <Reveal delay={0.2} className="mt-10">
              <ButtonLink href="/register">
                Open an account
                <ArrowRight className="size-4" />
              </ButtonLink>
            </Reveal>
          </div>

          <Parallax distance={34}>
            <LedgerPreview />
          </Parallax>
        </div>
      </Section>

      {/* ======================================================= security === */}
      <Section>
        <SectionHeading
          align="center"
          eyebrow="Custody & controls"
          title="Where the money actually sits."
          description="The structure matters more than the return. Here is ours, stated plainly enough to check."
          className="mx-auto max-w-3xl text-center"
        />

        <RevealGroup className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            {
              icon: Landmark,
              title: "Segregated client money",
              body: "Fiat is held in designated client accounts, separate from company funds, reconciled daily. Operating costs are never paid from client balances.",
            },
            {
              icon: Lock,
              title: "Qualified crypto custody",
              body: "Digital assets sit with a regulated custodian in cold storage under multi-party approval. Client assets are never pledged as collateral.",
            },
            {
              icon: ShieldCheck,
              title: "Auditable by design",
              body: "An append-only journal and a full audit log of every administrative action. Corrections are posted as reversals — history is never edited.",
            },
          ].map((item) => (
            <RevealItem key={item.title}>
              <div className="panel h-full p-7">
                <span className="flex size-11 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-bright">
                  <item.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-display text-[17px] font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal className="mt-10 text-center">
          <Link
            href="/security"
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-bright transition-colors hover:text-mint"
          >
            Read the full custody and security note
            <ArrowUpRight className="size-4" />
          </Link>
        </Reveal>
      </Section>

      {/* ======================================================= insights === */}
      <Section className="border-y border-line bg-abyss">
        <SectionHeading
          eyebrow="Insights"
          title="Written by the people running the book."
          description="No price predictions. Practical notes on risk, structure and the arithmetic that actually determines outcomes."
          action={
            <ButtonLink href="/insights" variant="outline">
              All articles
              <ArrowRight className="size-4" />
            </ButtonLink>
          }
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {posts.map((post, index) => (
            <Reveal key={post.slug} delay={index * 0.08}>
              <article className="panel group relative flex h-full flex-col p-6 transition-colors duration-500 hover:border-line-bright">
                <Badge tone="outline" className="w-fit">
                  {post.category}
                </Badge>
                <h3 className="mt-4 font-display text-[19px] font-semibold leading-snug text-ink transition-colors group-hover:text-brand-bright">
                  <Link href={`/insights/${post.slug}`}>
                    <span className="absolute inset-0" />
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink-muted">
                  {post.excerpt}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-6 text-[12px] text-ink-faint">
                  <span>{post.authorName}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={post.publishedAt?.toISOString()}>
                    {formatDate(post.publishedAt)}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span>{post.readingMinutes} min read</span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ============================================================ faq === */}
      <Section>
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeading
            eyebrow="Questions"
            title="The things people ask before they fund an account."
            description="If the answer you need is not here, the investment team replies to email within one business day."
            className="flex-col items-start"
          />

          <Reveal>
            <FaqAccordion items={HOME_FAQ} />
            <p className="mt-6 text-[14px] text-ink-muted">
              More detail on the{" "}
              <Link href="/faq" className="text-brand-bright hover:text-mint">
                full FAQ page
              </Link>
              .
            </p>
          </Reveal>
        </div>
      </Section>

      {/* ============================================================ cta === */}
      <Section className="border-t border-line">
        <Reveal>
          <div className="panel relative overflow-hidden px-8 py-16 text-center md:px-16 md:py-20">
            <div
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                background:
                  "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(91,140,255,0.20) 0%, transparent 65%)",
              }}
            />
            <div className="dot-backdrop pointer-events-none absolute inset-0 opacity-25" />

            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl md:text-[44px] md:leading-[1.06]">
                Start with the amount you would be comfortable losing.
              </h2>
              <p className="mt-5 text-[16.5px] leading-relaxed text-ink-muted">
                That is the honest way to begin, and it is how we would open an
                account ourselves. Verification takes minutes and there is no
                obligation to fund until you are ready.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink href="/register" size="lg" className="group">
                  Open an account
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </ButtonLink>
                <ButtonLink href="/contact" variant="outline" size="lg">
                  Talk to the team first
                </ButtonLink>
              </div>
              <p className="mt-7 text-[12.5px] text-ink-faint">
                Capital at risk. Target returns are objectives, not guarantees.
              </p>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  );
}

/**
 * A static illustration of the ledger view. Deliberately hard-coded rather than
 * pulled from the database: it is marketing copy, and showing a real account's
 * figures on a public page would be a privacy problem.
 */
function LedgerPreview() {
  const rows = [
    { ref: "JE-8F2K-QM4P", desc: "Deposit approved", debit: "Bank", credit: "Investor cash", amount: "25,000.00", tone: "mint" as const },
    { ref: "JE-3D7T-XR9L", desc: "Allocation — Balanced Index", debit: "Investor cash", credit: "Allocated capital", amount: "20,000.00", tone: "brand" as const },
    { ref: "JE-9K1W-PT6V", desc: "Return credited — period 04", debit: "Custody", credit: "Allocated capital", amount: "418.60", tone: "mint" as const },
    { ref: "JE-5R8N-LC2H", desc: "Management fee", debit: "Allocated capital", credit: "Revenue — fees", amount: "62.50", tone: "gold" as const },
  ];

  return (
    <Panel className="p-1.5" glow>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-loss/70" />
          <span className="size-2 rounded-full bg-gold/70" />
          <span className="size-2 rounded-full bg-mint/70" />
        </div>
        <span className="font-mono text-[11px] text-ink-faint">
          general ledger · account view
        </span>
      </div>

      <div className="divide-y divide-line/70">
        {rows.map((row) => (
          <div key={row.ref} className="px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="truncate text-[13.5px] font-medium text-ink">
                {row.desc}
              </span>
              <span
                className={`shrink-0 font-mono text-[13.5px] font-semibold tabular-nums ${
                  row.tone === "mint"
                    ? "text-mint"
                    : row.tone === "gold"
                      ? "text-gold"
                      : "text-brand-bright"
                }`}
              >
                {row.amount}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-ink-faint">
              <span>{row.ref}</span>
              <span aria-hidden="true">·</span>
              <span className="text-ink-muted">Dr</span>
              <span>{row.debit}</span>
              <span aria-hidden="true">→</span>
              <span className="text-ink-muted">Cr</span>
              <span>{row.credit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-line px-4 py-3">
        <span className="text-[11.5px] text-ink-faint">Debits = credits</span>
        <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-mint">
          <span className="size-1.5 rounded-full bg-mint shadow-[0_0_8px_currentColor]" />
          balanced
        </span>
      </div>
    </Panel>
  );
}
