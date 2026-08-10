import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { buildMetadata, JsonLd, breadcrumbSchema } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { Section, SectionHeading } from "@/components/marketing/section";
import { PlanCard, type PlanCardData } from "@/components/marketing/plan-card";
import { ButtonLink } from "@/components/ui/button";
import { Panel, Table, Td, Th, Badge } from "@/components/ui/primitives";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = buildMetadata({
  title: "Investment Plans — Crypto & Equity Mandates",
  description:
    "Five managed mandates from dollar income to concentrated digital-asset growth. Compare target returns, minimums, lock-up periods, fees and expected drawdown side by side.",
  path: "/plans",
  keywords: [
    "crypto investment plans",
    "managed investment portfolio",
    "stock market investment plans",
    "investment minimums and fees",
  ],
});

export const revalidate = 600;

const RISK_LABEL: Record<string, string> = {
  LOW: "Lower",
  MODERATE: "Moderate",
  HIGH: "Higher",
  VERY_HIGH: "Speculative",
};

const RISK_TONE: Record<string, "mint" | "brand" | "gold" | "loss"> = {
  LOW: "mint",
  MODERATE: "brand",
  HIGH: "gold",
  VERY_HIGH: "loss",
};

export default async function PlansPage() {
  const plans = await prisma.investmentPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const cards: PlanCardData[] = plans.map((plan) => ({
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
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Investment plans", path: "/plans" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Axiom Capital investment mandates",
            itemListElement: plans.map((plan, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: plan.name,
              url: absoluteUrl(`/plans/${plan.slug}`),
            })),
          },
        ]}
      />

      <Section className="pt-36 md:pt-44">
        <SectionHeading
          eyebrow="Mandates"
          title="Five ways to put capital to work."
          description="Each mandate is a published strategy with a stated allocation, a stated fee schedule and a stated tolerance for drawdown. Read the one that matches how much volatility you can actually live with — not the one with the biggest number."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((plan, index) => (
            <Reveal key={plan.slug} delay={index * 0.06}>
              <PlanCard plan={plan} />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------- comparison table --- */}
      <Section className="border-y border-line bg-abyss">
        <SectionHeading
          eyebrow="Side by side"
          title="Every number, on one screen."
          description="Target returns are objectives. The maximum drawdown column is what each mandate is built to tolerate, based on how its underlying assets have historically behaved."
        />

        <Reveal className="mt-12">
          <Panel>
            <Table className="min-w-[900px]">
              <thead>
                <tr>
                  <Th>Mandate</Th>
                  <Th align="right">Target p.a.</Th>
                  <Th align="right">Minimum</Th>
                  <Th align="right">Lock-up</Th>
                  <Th align="right">Mgmt fee</Th>
                  <Th align="right">Perf fee</Th>
                  <Th align="center">Risk</Th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="transition-colors hover:bg-surface-2/60">
                    <Td>
                      <Link
                        href={`/plans/${plan.slug}`}
                        className="font-medium text-ink transition-colors hover:text-brand-bright"
                      >
                        {plan.name}
                      </Link>
                      <span className="mt-0.5 block max-w-xs truncate text-[12px] text-ink-faint">
                        {plan.tagline}
                      </span>
                    </Td>
                    <Td align="right" mono>
                      {toNumber(plan.targetApyLow).toFixed(0)}–
                      {toNumber(plan.targetApyHigh).toFixed(0)}%
                    </Td>
                    <Td align="right" mono>
                      ${toNumber(plan.minimumAmount).toLocaleString("en-US")}
                    </Td>
                    <Td align="right" mono>
                      {plan.lockupDays === 0 ? "None" : `${plan.lockupDays}d`}
                    </Td>
                    <Td align="right" mono>
                      {toNumber(plan.managementFeePct).toFixed(2)}%
                    </Td>
                    <Td align="right" mono>
                      {toNumber(plan.performanceFeePct).toFixed(0)}%
                    </Td>
                    <Td align="center">
                      <Badge tone={RISK_TONE[plan.riskLevel]}>
                        {RISK_LABEL[plan.riskLevel]}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
        </Reveal>

        <Reveal className="mt-6">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Performance fees are charged on profit only. A 0.5% fee applies to
            withdrawals, and leaving a mandate before its lock-up ends incurs an
            early exit fee shown on each plan page. There is no account fee, no
            deposit fee and no inactivity fee. The{" "}
            <Link href="/legal/fees" className="text-brand-bright hover:text-mint">
              fees page
            </Link>{" "}
            works through a complete example in dollars.
          </p>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <div className="panel flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-12">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-semibold text-ink md:text-3xl">
                Not sure which one fits?
              </h2>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-muted">
                Tell us your horizon and the drawdown you could sit through, and
                the investment team will tell you which mandate matches —
                including if the answer is none of them.
              </p>
            </div>
            <ButtonLink href="/contact" size="lg" className="shrink-0">
              Talk to the team
              <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
