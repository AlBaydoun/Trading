import type { Metadata } from "next";
import Link from "next/link";
import {
  Fingerprint,
  KeyRound,
  Landmark,
  Lock,
  ScrollText,
  ServerCog,
  ShieldAlert,
  Snowflake,
} from "lucide-react";
import { buildMetadata, JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Alert, Panel, PanelHeader } from "@/components/ui/primitives";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";

export const metadata: Metadata = buildMetadata({
  title: "Security, Custody & Client Asset Protection",
  description:
    "How client money is segregated, where digital assets are custodied, what the platform logs, and exactly where you would rank if the company failed.",
  path: "/security",
  keywords: [
    "segregated client funds",
    "crypto cold storage custody",
    "investment platform security",
    "client asset protection",
  ],
});

const CONTROLS = [
  {
    icon: Landmark,
    title: "Segregated client money",
    body: "Fiat balances sit in designated client accounts, titled to show they are client assets and held apart from company funds. Operating costs are paid from the company's own account — never from client balances.",
  },
  {
    icon: Snowflake,
    title: "Cold storage custody",
    body: "Digital assets are held with a qualified custodian, predominantly in cold storage under multi-party approval. Hot-wallet balances are capped at the amount needed to service same-day withdrawals.",
  },
  {
    icon: ScrollText,
    title: "Append-only ledger",
    body: "Every movement is a balanced double-entry journal. Entries are never edited or deleted — a correction posts a reversal that points back at the original, so the mistake and the fix are both permanently visible.",
  },
  {
    icon: Fingerprint,
    title: "Full audit trail",
    body: "Every administrative action records who did it, when, from which address, and what the record looked like before and after. Sensitive fields are redacted in the log itself.",
  },
  {
    icon: KeyRound,
    title: "Session and credential handling",
    body: "Passwords are hashed with bcrypt at cost 12. Session cookies carry an opaque token; the database stores only its HMAC, so a dump of the sessions table cannot be replayed as a login.",
  },
  {
    icon: ServerCog,
    title: "Rate limiting and lockout",
    body: "Authentication is rate limited per address and per account, with automatic lockout after repeated failures. Every attempt, successful or not, is recorded.",
  },
];

const RECONCILIATION = [
  ["Daily", "Client money balances reconciled against bank and custodian statements"],
  ["Daily", "Ledger integrity check — every account balance re-derived from journal lines"],
  ["Weekly", "Pending deposit and withdrawal queue reviewed for aged items"],
  ["Monthly", "Fee accruals reviewed against the published schedule for each mandate"],
  ["Annually", "Independent audit of the client money reconciliation"],
];

export default function SecurityPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Security", path: "/security" },
        ])}
      />

      <Section className="pt-36 md:pt-44">
        <SectionHeading
          eyebrow="Custody & controls"
          title="The structure matters more than the return."
          description="Advertised performance is the easiest thing on an investment site to get right and the least informative. What follows is the part that determines whether any of it is real."
        />

        <RevealGroup className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
          {CONTROLS.map((control) => (
            <RevealItem key={control.title}>
              <div className="h-full bg-surface p-7">
                <span className="flex size-11 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-bright">
                  <control.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-display text-[17px] font-semibold text-ink">
                  {control.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-muted">
                  {control.body}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section className="border-y border-line bg-abyss">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
              Where you would rank if we failed
            </h2>
            <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-ink-muted">
              <p>
                This is the question most platforms answer vaguely, so here it is
                directly.
              </p>
              <p>
                Assets held for you in segregated accounts are your property, not
                ours. In an insolvency they do not form part of the estate and are
                returned to clients rather than distributed to creditors. That
                protection is the entire point of segregation, and it is why
                client assets are never pledged as collateral for company
                positions.
              </p>
              <p>
                What segregation does <em>not</em> protect you against is
                investment loss. If a mandate falls 40%, you own 60% of what you
                had. No custody structure, insurance policy or compensation
                scheme changes that, and any platform implying otherwise is
                misleading you.
              </p>
            </div>

            <Alert tone="gold" className="mt-8">
              <div className="flex gap-3">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <p className="text-[14px] leading-relaxed">
                  Cryptoassets are not covered by investor compensation schemes
                  in most jurisdictions, including the UK and the EU. Segregated
                  custody is a real protection; a compensation scheme backstop is
                  not available for the crypto side of any mandate.
                </p>
              </div>
            </Alert>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel>
              <PanelHeader
                title="Reconciliation schedule"
                description="What gets checked, and how often."
              />
              <ul className="divide-y divide-line">
                {RECONCILIATION.map(([cadence, task]) => (
                  <li key={task} className="flex gap-5 px-5 py-4">
                    <span className="w-20 shrink-0 font-mono text-[12px] uppercase tracking-[0.08em] text-brand">
                      {cadence}
                    </span>
                    <span className="text-[14px] leading-relaxed text-ink-muted">
                      {task}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="mt-6">
              <PanelHeader title="Verify it yourself" />
              <div className="space-y-3 px-5 py-5 text-[14px] leading-relaxed text-ink-muted">
                <p>
                  Your dashboard exposes the same ledger the operations team
                  works from. Every balance can be traced to the journal entries
                  that produced it, each with a reference, a timestamp and both
                  sides of the entry.
                </p>
                <p>
                  Export the full history as CSV and add it up. If the arithmetic
                  does not agree with the balance we show, that is a bug and we
                  want to hear about it.
                </p>
              </div>
            </Panel>
          </Reveal>
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          <Reveal>
            <div className="panel h-full p-8">
              <span className="flex size-11 items-center justify-center rounded-xl border border-line-bright bg-surface-2 text-ink-muted">
                <Lock className="size-5" />
              </span>
              <h2 className="mt-5 font-display text-xl font-semibold text-ink">
                Your documents
              </h2>
              <div className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-ink-muted">
                <p>
                  Identity documents are encrypted at rest, accessible only to
                  compliance staff, and every access is logged against a named
                  reviewer.
                </p>
                <p>
                  They are retained for the statutory period — typically five
                  years after the account relationship ends — and then deleted.
                  You can request a copy of what is held about you, or its
                  deletion once the retention period lapses.
                </p>
                <p>
                  Documents are never sent over email or stored in shared drives.
                  If anyone claiming to be from Axiom asks you to email an ID,
                  it is not us.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="panel h-full p-8">
              <span className="flex size-11 items-center justify-center rounded-xl border border-loss/30 bg-loss/10 text-loss">
                <ShieldAlert className="size-5" />
              </span>
              <h2 className="mt-5 font-display text-xl font-semibold text-ink">
                Reporting a vulnerability
              </h2>
              <div className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-ink-muted">
                <p>
                  If you find a security issue, email{" "}
                  <a
                    href="mailto:security@axiomcapital.example"
                    className="text-brand-bright hover:text-mint"
                  >
                    security@axiomcapital.example
                  </a>{" "}
                  with enough detail to reproduce it. We acknowledge within one
                  business day.
                </p>
                <p>
                  We will not pursue legal action against researchers acting in
                  good faith who avoid accessing other people&apos;s data,
                  degrading service, or disclosing publicly before a fix is
                  shipped.
                </p>
                <p>
                  Please do not test against live client accounts. Ask us for a
                  test account instead.
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-10">
          <p className="text-[14px] text-ink-muted">
            Related reading:{" "}
            <Link href="/insights/how-segregated-client-funds-work" className="text-brand-bright hover:text-mint">
              what happens to your money if a platform fails
            </Link>{" "}
            and{" "}
            <Link href="/insights/kyc-aml-explained-for-investors" className="text-brand-bright hover:text-mint">
              why we ask for your passport
            </Link>
            .
          </p>
        </Reveal>
      </Section>
    </>
  );
}
