import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, JsonLd, faqSchema, breadcrumbSchema } from "@/lib/seo";
import { FAQ_ITEMS, type FaqItem } from "@/lib/content/faq";
import { Section, SectionHeading } from "@/components/marketing/section";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = buildMetadata({
  title: "Frequently Asked Questions",
  description:
    "Minimums, funding methods, withdrawal times, lock-ups, fees, custody and what happens in a downturn — the questions investors ask before funding an account, answered directly.",
  path: "/faq",
  keywords: [
    "investment platform FAQ",
    "crypto investment minimum",
    "how long do withdrawals take",
    "investment platform fees",
  ],
});

const CATEGORIES: FaqItem["category"][] = [
  "Getting started",
  "Money",
  "Risk",
  "Security",
  "Fees",
];

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={[
          faqSchema(
            FAQ_ITEMS.map((item) => ({
              question: item.question,
              answer: item.answer,
            })),
          ),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
        ]}
      />

      <Section className="pt-36 md:pt-44">
        <SectionHeading
          eyebrow="Questions"
          title="Answers, without the hedging."
          description="If something here reads like it is avoiding the question, tell us and we will rewrite it. Anything not covered, the investment team answers by email within one business day."
        />

        <div className="mt-16 space-y-14">
          {CATEGORIES.map((category) => {
            const items = FAQ_ITEMS.filter((item) => item.category === category);
            if (items.length === 0) return null;

            return (
              <Reveal key={category}>
                <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
                  <h2 className="font-display text-xl font-semibold tracking-tight text-ink lg:sticky lg:top-24 lg:self-start">
                    {category}
                  </h2>
                  <FaqAccordion items={items} />
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <Section className="border-t border-line">
        <Reveal>
          <div className="panel flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-12">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl font-semibold text-ink md:text-3xl">
                Still deciding?
              </h2>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-muted">
                The{" "}
                <Link href="/legal/risk-disclosure" className="text-brand-bright hover:text-mint">
                  risk disclosure
                </Link>{" "}
                is the most useful thing to read next. It is blunter than this
                page, on purpose.
              </p>
            </div>
            <ButtonLink href="/contact" variant="outline" size="lg" className="shrink-0">
              Ask us directly
            </ButtonLink>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
