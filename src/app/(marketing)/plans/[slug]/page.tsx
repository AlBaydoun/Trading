import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { toNumber, formatMoney } from "@/lib/money";
import {
  buildMetadata,
  JsonLd,
  breadcrumbSchema,
  productSchema,
} from "@/lib/seo";
import { Section } from "@/components/marketing/section";
import { ButtonLink } from "@/components/ui/button";
import {
  Alert,
  Badge,
  Eyebrow,
  Meter,
  Panel,
  PanelHeader,
} from "@/components/ui/primitives";
import { DonutChart } from "@/components/ui/sparkline";
import { Reveal } from "@/components/motion/reveal";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 600;

export async function generateStaticParams() {
  const plans = await prisma.investmentPlan.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return plans.map((plan) => ({ slug: plan.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const plan = await prisma.investmentPlan.findUnique({ where: { slug } });

  if (!plan) {
    return buildMetadata({
      title: "Plan not found",
      description: "This investment mandate is no longer available.",
      path: `/plans/${slug}`,
      noIndex: true,
    });
  }

  const low = toNumber(plan.targetApyLow).toFixed(0);
  const high = toNumber(plan.targetApyHigh).toFixed(0);

  return buildMetadata({
    title: `${plan.name} — ${low}–${high}% Target Annual Return`,
    description: `${plan.tagline}. Minimum $${toNumber(plan.minimumAmount).toLocaleString("en-US")}, ${plan.lockupDays === 0 ? "no lock-up" : `${plan.lockupDays}-day lock-up`}. Full allocation, fee schedule and risk disclosure.`,
    path: `/plans/${plan.slug}`,
    keywords: [
      `${plan.name.toLowerCase()} investment plan`,
      "managed crypto portfolio",
      "investment mandate",
      plan.riskLevel === "LOW" ? "low risk crypto investment" : "growth investment plan",
    ],
    image: `/api/og?title=${encodeURIComponent(plan.name)}&eyebrow=${encodeURIComponent("Investment mandate")}&badge=${encodeURIComponent(`${low}–${high}% target`)}`,
  });
}

const RISK_META: Record<
  string,
  { label: string; tone: "mint" | "brand" | "gold" | "loss"; score: number; drawdown: string }
> = {
  LOW: { label: "Lower risk", tone: "mint", score: 25, drawdown: "5–10%" },
  MODERATE: { label: "Moderate risk", tone: "brand", score: 50, drawdown: "15–30%" },
  HIGH: { label: "Higher risk", tone: "gold", score: 75, drawdown: "40–60%" },
  VERY_HIGH: { label: "Speculative", tone: "loss", score: 100, drawdown: "50%+" },
};

const PAYOUT_LABEL: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ON_MATURITY: "At maturity",
};

const SLICE_COLORS = [
  "var(--color-brand)",
  "var(--color-mint)",
  "var(--color-violet)",
  "var(--color-gold)",
  "var(--color-brand-deep)",
  "var(--color-line-bright)",
];

export default async function PlanPage({ params }: PageProps) {
  const { slug } = await params;

  const plan = await prisma.investmentPlan.findUnique({ where: { slug } });
  if (!plan || !plan.isActive) notFound();

  const others = await prisma.investmentPlan.findMany({
    where: { isActive: true, id: { not: plan.id } },
    orderBy: { sortOrder: "asc" },
    take: 3,
    select: { slug: true, name: true, tagline: true, targetApyLow: true, targetApyHigh: true },
  });

  const risk = RISK_META[plan.riskLevel];
  const allocation = Array.isArray(plan.allocation)
    ? (plan.allocation as { label: string; percent: number; kind: string }[])
    : [];

  const minimum = toNumber(plan.minimumAmount);
  const low = toNumber(plan.targetApyLow);
  const high = toNumber(plan.targetApyHigh);
  const mgmt = toNumber(plan.managementFeePct);
  const perf = toNumber(plan.performanceFeePct);

  // Worked example on a round number well above the minimum, at the midpoint
  // of the target range — the arithmetic every investor should do themselves.
  const example = Math.max(minimum, 10_000);
  const midReturn = ((low + high) / 2 / 100) * example;
  const mgmtFee = (mgmt / 100) * example;
  const perfFee = (perf / 100) * Math.max(0, midReturn - mgmtFee);
  const netReturn = midReturn - mgmtFee - perfFee;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Investment plans", path: "/plans" },
            { name: plan.name, path: `/plans/${plan.slug}` },
          ]),
          productSchema({
            name: plan.name,
            slug: plan.slug,
            description: plan.description,
            minimumAmount: minimum,
            riskLevel: plan.riskLevel,
            targetApyLow: low,
            targetApyHigh: high,
          }),
        ]}
      />

      <Section className="pt-36 md:pt-44">
        <nav aria-label="Breadcrumb" className="mb-8 text-[13px] text-ink-faint">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/plans" className="hover:text-ink">Plans</Link>
          <span className="mx-2">/</span>
          <span className="text-ink-muted">{plan.name}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <div>
            <Eyebrow>Investment mandate</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink md:text-display-sm">
              {plan.name}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
              {plan.tagline}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone={risk.tone}>{risk.label}</Badge>
              <Badge tone="outline">
                {plan.lockupDays === 0 ? "No lock-up" : `${plan.lockupDays}-day lock-up`}
              </Badge>
              <Badge tone="outline">
                {PAYOUT_LABEL[plan.payoutFrequency]} payout
              </Badge>
            </div>

            <div className="prose-invert mt-10 max-w-2xl">
              <h2 className="font-display text-xl font-semibold text-ink">
                The strategy
              </h2>
              <p className="mt-3 text-[16px] leading-[1.75] text-ink-muted">
                {plan.description}
              </p>
            </div>

            {plan.highlights.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-xl font-semibold text-ink">
                  What this means in practice
                </h2>
                <ul className="mt-4 space-y-3">
                  {plan.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-3 text-[15px] leading-relaxed text-ink-muted">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-mint" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* --------------------------------------- worked example --- */}
            <div className="mt-12">
              <h2 className="font-display text-xl font-semibold text-ink">
                A worked example
              </h2>
              <p className="mt-2 text-[14px] text-ink-muted">
                On {formatMoney(example)} invested for one year, assuming the
                midpoint of the target range. This is arithmetic, not a forecast.
              </p>

              <Panel className="mt-5">
                <dl className="divide-y divide-line">
                  {[
                    { label: "Amount invested", value: formatMoney(example), tone: "" },
                    { label: `Gross return at ${((low + high) / 2).toFixed(1)}%`, value: `+${formatMoney(midReturn)}`, tone: "text-mint" },
                    { label: `Management fee (${mgmt.toFixed(2)}% of assets)`, value: `−${formatMoney(mgmtFee)}`, tone: "text-loss" },
                    { label: `Performance fee (${perf.toFixed(0)}% of profit)`, value: `−${formatMoney(perfFee)}`, tone: "text-loss" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <dt className="text-[14px] text-ink-muted">{row.label}</dt>
                      <dd className={`font-mono text-[14px] font-medium tabular-nums ${row.tone || "text-ink"}`}>
                        {row.value}
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 bg-surface-2 px-5 py-4">
                    <dt className="text-[14px] font-semibold text-ink">
                      Net to you
                    </dt>
                    <dd className="text-right">
                      <span className="block font-mono text-lg font-semibold tabular-nums text-mint">
                        +{formatMoney(netReturn)}
                      </span>
                      <span className="block font-mono text-[12px] tabular-nums text-ink-faint">
                        {((netReturn / example) * 100).toFixed(2)}% net
                      </span>
                    </dd>
                  </div>
                </dl>
              </Panel>
            </div>

            {/* ------------------------------------------------- risks --- */}
            <div className="mt-12">
              <h2 className="font-display text-xl font-semibold text-ink">
                What can go wrong
              </h2>
              <Alert tone="gold" className="mt-4">
                <div className="flex gap-3">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <div className="space-y-3 text-[14px] leading-relaxed">
                    <p>
                      This mandate is built to tolerate a peak-to-trough decline
                      of roughly{" "}
                      <strong className="text-ink">{risk.drawdown}</strong>. A
                      decline of that size is an expected part of the strategy,
                      not a failure of it — but you may still get back less than
                      you put in, and the loss can be permanent.
                    </p>
                    <p>
                      {plan.lockupDays > 0
                        ? `Capital is locked for ${plan.lockupDays} days. Exiting early costs ${toNumber(plan.earlyExitFeePct).toFixed(2)}% of the position, and you cannot exit at a chosen price — you exit at the value on the day.`
                        : "There is no lock-up, but exiting during a drawdown crystallises the loss."}
                    </p>
                    <p>
                      Target returns are objectives derived from the strategy's
                      assumptions. When those assumptions do not hold, the
                      outcome falls outside the range in either direction.
                    </p>
                  </div>
                </div>
              </Alert>
            </div>
          </div>

          {/* ------------------------------------------------- sidebar --- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Panel glow className="p-6">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                Target annual return
              </p>
              <p className="mt-2 font-mono text-[44px] font-semibold leading-none tabular-nums text-ink">
                {low.toFixed(0)}
                <span className="text-ink-faint">–</span>
                {high.toFixed(0)}
                <span className="ml-1 text-2xl text-ink-muted">%</span>
              </p>

              <div className="mt-5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-ink-faint">Risk level</span>
                  <span className="font-medium text-ink">{risk.label}</span>
                </div>
                <Meter value={risk.score} tone={risk.tone} className="mt-2" label={risk.label} />
              </div>

              <dl className="mt-6 space-y-3.5 border-t border-line pt-5 text-[13.5px]">
                {[
                  ["Minimum", `$${minimum.toLocaleString("en-US")}`],
                  [
                    "Maximum",
                    plan.maximumAmount
                      ? `$${toNumber(plan.maximumAmount).toLocaleString("en-US")}`
                      : "No cap",
                  ],
                  ["Lock-up", plan.lockupDays === 0 ? "None" : `${plan.lockupDays} days`],
                  ["Payout", PAYOUT_LABEL[plan.payoutFrequency]],
                  ["Management fee", `${mgmt.toFixed(2)}% p.a.`],
                  ["Performance fee", `${perf.toFixed(0)}% of profit`],
                  ["Early exit fee", `${toNumber(plan.earlyExitFeePct).toFixed(2)}%`],
                  ["Expected drawdown", risk.drawdown],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="font-mono font-medium tabular-nums text-ink">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <ButtonLink href="/register" size="lg" className="mt-7 w-full">
                Open an account
                <ArrowRight className="size-4" />
              </ButtonLink>
              <p className="mt-3 text-center text-[11.5px] text-ink-faint">
                Verification takes minutes. No obligation to fund.
              </p>
            </Panel>

            {allocation.length > 0 && (
              <Panel className="mt-6">
                <PanelHeader title="Target allocation" />
                <div className="flex flex-col items-center gap-6 p-6 sm:flex-row">
                  <DonutChart
                    segments={allocation.map((slice, index) => ({
                      label: slice.label,
                      value: slice.percent,
                      color: SLICE_COLORS[index % SLICE_COLORS.length],
                    }))}
                    size={144}
                    thickness={16}
                    centerValue={`${allocation.length}`}
                    centerLabel="sleeves"
                  />
                  <ul className="flex-1 space-y-2.5">
                    {allocation.map((slice, index) => (
                      <li key={slice.label} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="flex items-center gap-2 text-ink-muted">
                          <span
                            className="size-2.5 shrink-0 rounded-sm"
                            style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }}
                          />
                          {slice.label}
                        </span>
                        <span className="font-mono tabular-nums text-ink">
                          {slice.percent}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Panel>
            )}
          </aside>
        </div>
      </Section>

      {others.length > 0 && (
        <Section className="border-t border-line bg-abyss">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Other mandates
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {others.map((other) => (
              <Reveal key={other.slug}>
                <Link
                  href={`/plans/${other.slug}`}
                  className="panel group block h-full p-6 transition-colors hover:border-brand/40"
                >
                  <h3 className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-brand-bright">
                    {other.name}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
                    {other.tagline}
                  </p>
                  <p className="mt-4 font-mono text-[13px] tabular-nums text-ink-faint">
                    {toNumber(other.targetApyLow).toFixed(0)}–
                    {toNumber(other.targetApyHigh).toFixed(0)}% target
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
