import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma, safeQuery } from "@/lib/prisma";
import { getPlatformTotals } from "@/lib/ledger";
import { formatCompactMoney } from "@/lib/money";
import { buildMetadata, JsonLd, breadcrumbSchema } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ButtonLink } from "@/components/ui/button";
import { Stat } from "@/components/ui/primitives";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export const metadata: Metadata = buildMetadata({
  title: "About Axiom Capital",
  description:
    "Who runs the desk, what we believe about risk, and the operating principles behind every mandate — including the ones that cost us money in the short term.",
  path: "/about",
});

export const revalidate = 3600;

const PRINCIPLES = [
  {
    title: "Say the downside first",
    body: "Every mandate leads with its expected drawdown, not its target return. An investor who is surprised by a decline sells at the bottom, which is the single most expensive thing that can happen to a portfolio.",
  },
  {
    title: "Fees are lines, not footnotes",
    body: "Each fee posts its own ledger entry with the rate that produced it. If you cannot see what you paid and why, you are not being charged transparently — regardless of what the fee schedule says.",
  },
  {
    title: "Rules over instincts",
    body: "Rebalancing dates, position caps and de-risking triggers are written down before capital is deployed. A rule that survives a bad month is worth more than a good call in a calm one.",
  },
  {
    title: "Size for the bad case",
    body: "Position sizing assumes the worst historical drawdown repeats, not the average year. Strategies that only work when nothing goes wrong are not strategies.",
  },
  {
    title: "Never commingle",
    body: "Client assets sit in segregated accounts and are never used as collateral for the firm's own positions. The failures that destroyed client capital elsewhere almost all trace back to this one line.",
  },
  {
    title: "Correct, don't erase",
    body: "The ledger is append-only. A mistake is fixed by posting a reversal that points at the original entry, so the history of an error is as visible as the error itself.",
  },
];

const TEAM = [
  {
    name: "Marcus Feld",
    role: "Chief Investment Officer",
    bio: "Sixteen years across multi-asset allocation and systematic equity. Previously ran a market-neutral book through two full cycles. Believes most alpha claims are fee claims in disguise.",
  },
  {
    name: "Nadia Rahman",
    role: "Head of Portfolio Risk",
    bio: "Built the risk framework that sizes every mandate. Spent five years on the counterparty side watching leveraged books fail, which shapes how she thinks about position limits.",
  },
  {
    name: "Elena Whitfield",
    role: "Head of Compliance",
    bio: "Former regulator. Runs KYC, AML and the audit trail, and holds a veto on any product change that would weaken client asset protection.",
  },
  {
    name: "Omar Haddad",
    role: "Head of Operations",
    bio: "Owns settlement, reconciliation and the daily proof that the ledger balances. Every deposit and withdrawal passes across his desk.",
  },
];

export default async function AboutPage() {
  const zero = new Prisma.Decimal(0);

  const [totals, investors, plans] = await Promise.all([
    safeQuery(
      () => getPlatformTotals(),
      { assets: zero, liabilities: zero, income: zero, expenses: zero, netRevenue: zero, aum: zero },
      "platform totals",
    ),
    safeQuery(() => prisma.user.count({ where: { role: "USER" } }), 0, "investor count"),
    safeQuery(
      () => prisma.investmentPlan.count({ where: { isActive: true } }),
      0,
      "active plan count",
    ),
  ]);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />

      <Section className="pt-36 md:pt-44">
        <SectionHeading
          eyebrow="About"
          title="A desk that tells you what it is doing with your money."
          description="Axiom exists because the gap between what investment platforms advertise and what investors actually receive is mostly a transparency problem, not a returns problem. We built the ledger first and the marketing site second."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Assets under management" value={formatCompactMoney(totals.aum)} sub="Owed to investors" />
          <Stat label="Accounts" value={investors.toLocaleString("en-US")} sub="Across all mandates" />
          <Stat label="Active mandates" value={plans} sub="Published strategies" />
          <Stat label="Founded" value={siteConfig.founded} sub={siteConfig.contact.address.city} />
        </div>
      </Section>

      <Section className="border-y border-line bg-abyss">
        <SectionHeading
          eyebrow="Principles"
          title="Six rules we do not break."
          description="These are operating constraints, not marketing copy. Several of them cost us revenue, which is roughly how you can tell they are real."
        />

        <RevealGroup className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((principle, index) => (
            <RevealItem key={principle.title}>
              <div className="h-full bg-surface p-7 transition-colors duration-500 hover:bg-surface-2">
                <span className="font-mono text-[12px] tabular-nums text-brand">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-display text-[17px] font-semibold text-ink">
                  {principle.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-muted">
                  {principle.body}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="The team"
          title="Who is actually responsible."
          description="Four people whose decisions affect your account, and what each of them owns."
        />

        <RevealGroup className="mt-14 grid gap-6 md:grid-cols-2">
          {TEAM.map((member) => (
            <RevealItem key={member.name}>
              <article className="panel flex h-full gap-5 p-6">
                <span
                  className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line-bright bg-linear-to-br from-surface-3 to-surface font-display text-lg font-semibold text-brand-bright"
                  aria-hidden="true"
                >
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <div>
                  <h3 className="font-display text-[17px] font-semibold text-ink">
                    {member.name}
                  </h3>
                  <p className="mt-0.5 text-[12.5px] uppercase tracking-[0.1em] text-brand">
                    {member.role}
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
                    {member.bio}
                  </p>
                </div>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section className="border-t border-line bg-abyss">
        <div className="grid gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
              What we are not
            </h2>
            <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-ink-muted">
              <p>
                We are not an exchange. You cannot place individual trades here,
                and we do not hold an order book. Axiom runs managed mandates —
                you allocate to a strategy, the desk executes it.
              </p>
              <p>
                We are not a bank. Your balance is not a deposit and is not
                covered by a deposit guarantee scheme. It is a claim on assets
                held for you in segregated accounts, which is a different and
                more specific protection.
              </p>
              <p>
                We are not offering guaranteed returns. Every published figure is
                a target derived from a strategy&apos;s assumptions. When those
                assumptions break, so does the target.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="panel h-full p-8">
              <h2 className="font-display text-xl font-semibold text-ink">
                Regulatory position
              </h2>
              <p className="mt-4 text-[14.5px] leading-relaxed text-ink-muted">
                {siteConfig.legalName} is in the process of establishing its
                regulatory permissions. Until that is complete, this platform
                should be treated as a demonstration of the operating model
                rather than as an authorised investment service, and no live
                client capital should be accepted.
              </p>
              <p className="mt-4 text-[14.5px] leading-relaxed text-ink-muted">
                When authorisation is granted, this page will name the regulator
                and the firm reference number so you can verify it on the
                regulator&apos;s own register — which is the only place worth
                checking.
              </p>
              <div className="mt-7 border-t border-line pt-6">
                <p className="text-[12px] uppercase tracking-[0.14em] text-ink-faint">
                  Registered office
                </p>
                <address className="mt-2 text-[14px] not-italic leading-relaxed text-ink-muted">
                  {siteConfig.contact.address.street}
                  <br />
                  {siteConfig.contact.address.city}{" "}
                  {siteConfig.contact.address.postalCode}
                  <br />
                  {siteConfig.registration}
                </address>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-12">
          <ButtonLink href="/contact" size="lg">
            Talk to the team
            <ArrowRight className="size-4" />
          </ButtonLink>
        </Reveal>
      </Section>
    </>
  );
}
