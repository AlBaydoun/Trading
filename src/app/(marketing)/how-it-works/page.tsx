import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  FileCheck2,
  LineChart,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { buildMetadata, JsonLd, breadcrumbSchema } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/primitives";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export const metadata: Metadata = buildMetadata({
  title: "How It Works — Opening, Funding and Investing",
  description:
    "From account opening to withdrawal: identity verification, funding by bank transfer or crypto, choosing a mandate, how returns are credited, and how to get your money out.",
  path: "/how-it-works",
  keywords: [
    "how to invest in crypto",
    "open investment account",
    "fund investment account",
    "withdraw investment",
  ],
});

const STEPS = [
  {
    icon: FileCheck2,
    title: "Open and verify",
    duration: "5–10 minutes",
    body: "Create an account with an email address and a password. To move money you complete identity verification: a government photo ID, a selfie, a proof of address issued in the last three months, and a declaration of where the funds come from.",
    detail: [
      "Automated checks clear most accounts within minutes",
      "Anything ambiguous goes to a compliance reviewer the same business day",
      "Documents are encrypted at rest and access is logged",
    ],
  },
  {
    icon: Wallet,
    title: "Fund the account",
    duration: "Same day to 1 business day",
    body: "Submit a deposit request for the amount you intend to send, then transfer using the reference shown. Operations matches the incoming payment against your request and credits your cash balance.",
    detail: [
      "Bank transfer in USD, EUR or GBP",
      "BTC, ETH or USDT (TRC-20 and ERC-20)",
      "Minimum first deposit $100 — no deposit fee",
    ],
  },
  {
    icon: LineChart,
    title: "Choose a mandate",
    duration: "Instant",
    body: "Allocate cash to one or more mandates. The allocation moves your balance from cash to allocated capital as a ledger entry you can see, and the position appears in your dashboard immediately.",
    detail: [
      "Hold several mandates at once if you want to split exposure",
      "Fees, lock-up and expected drawdown are shown before you confirm",
      "Minimums range from $500 to $50,000 depending on the mandate",
    ],
  },
  {
    icon: ReceiptText,
    title: "Watch it work",
    duration: "Ongoing",
    body: "Returns are credited per period as itemised accrual entries — never as a single moving number. Each one shows the rate, the period and the amount, and posts a matching journal entry.",
    detail: [
      "Daily, monthly, quarterly or at-maturity depending on the mandate",
      "Losses are posted the same way as gains, with the same visibility",
      "Export the full history as CSV at any time",
    ],
  },
  {
    icon: Banknote,
    title: "Withdraw",
    duration: "1–3 business days",
    body: "Close a position to return its value to your cash balance, then request a withdrawal to your bank account or wallet. Requests are reviewed the same business day.",
    detail: [
      "0.5% withdrawal fee; minimum withdrawal $50",
      "Early exit from a locked mandate incurs the plan's exit fee",
      "Destination details are captured at request time and cannot be changed after",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "How it works", path: "/how-it-works" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How to invest with Axiom Capital",
            description:
              "Open an account, verify your identity, fund it, choose an investment mandate and withdraw.",
            totalTime: "PT30M",
            step: STEPS.map((step, index) => ({
              "@type": "HowToStep",
              position: index + 1,
              name: step.title,
              text: step.body,
              url: absoluteUrl(`/how-it-works#step-${index + 1}`),
            })),
          },
        ]}
      />

      <Section className="pt-36 md:pt-44">
        <SectionHeading
          eyebrow="How it works"
          title="Five steps, and nothing hidden between them."
          description="The whole process runs in the browser. There is no relationship manager to get past, no minimum-commitment call, and no document that arrives by post."
        />

        <RevealGroup className="mt-16 space-y-px">
          {STEPS.map((step, index) => (
            <RevealItem key={step.title}>
              <div
                id={`step-${index + 1}`}
                className="group grid scroll-mt-28 gap-8 border-t border-line py-10 md:grid-cols-[auto_1fr_1fr] md:gap-12"
              >
                <div className="flex items-start gap-5 md:flex-col md:items-center">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line-bright bg-surface text-brand transition-colors duration-500 group-hover:border-brand/50 group-hover:text-mint">
                    <step.icon className="size-6" />
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-ink-faint md:mt-3">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                    {step.title}
                  </h2>
                  <p className="mt-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-mint">
                    {step.duration}
                  </p>
                  <p className="mt-4 text-[15.5px] leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                </div>

                <ul className="space-y-2.5 md:pt-1">
                  {step.detail.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2.5 text-[14px] leading-relaxed text-ink-muted"
                    >
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section className="border-y border-line bg-abyss">
        <SectionHeading
          eyebrow="Behind the scenes"
          title="What happens to a deposit, exactly."
          description="Every movement of value posts a balanced double-entry journal. This is what your $10,000 does on its way into a mandate."
        />

        <Reveal className="mt-12">
          <Panel className="overflow-hidden">
            <ol className="divide-y divide-line">
              {[
                {
                  event: "You submit a deposit request",
                  ledger: "No ledger impact — the request is recorded as pending",
                },
                {
                  event: "Operations matches your bank transfer",
                  ledger: "Dr Client money — bank $10,000 · Cr Your cash balance $10,000",
                },
                {
                  event: "You allocate to Balanced Index",
                  ledger: "Dr Your cash balance $10,000 · Cr Your allocated capital $10,000",
                },
                {
                  event: "The portfolio gains 1.4% in the period",
                  ledger: "Dr Client assets — custody $140 · Cr Your allocated capital $140",
                },
                {
                  event: "You close the position",
                  ledger: "Dr Your allocated capital $10,140 · Cr Your cash $10,119 · Cr Performance fee $21",
                },
              ].map((row, index) => (
                <li key={row.event} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:gap-8">
                  <span className="flex items-center gap-3 md:w-[45%]">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line-bright font-mono text-[11px] text-ink-faint">
                      {index + 1}
                    </span>
                    <span className="text-[14px] text-ink">{row.event}</span>
                  </span>
                  <span className="font-mono text-[12.5px] leading-relaxed text-ink-muted md:flex-1">
                    {row.ledger}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </Reveal>

        <Reveal className="mt-6">
          <p className="text-[13.5px] leading-relaxed text-ink-muted">
            Debits always equal credits. Your dashboard shows every one of these
            entries with its reference and timestamp, and the platform can
            re-derive all balances from the journal lines to prove the book
            reconciles.{" "}
            <Link href="/security" className="text-brand-bright hover:text-mint">
              More on custody and controls
            </Link>
            .
          </p>
        </Reveal>
      </Section>

      <Section>
        <Reveal>
          <div className="panel flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-12">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-semibold text-ink md:text-3xl">
                Ready when you are.
              </h2>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-muted">
                Opening an account costs nothing and commits you to nothing.
                You can look around the dashboard before you decide to fund it.
              </p>
            </div>
            <ButtonLink href="/register" size="lg" className="shrink-0">
              Open an account
              <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
