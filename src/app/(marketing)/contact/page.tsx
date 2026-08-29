import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, ShieldQuestion } from "lucide-react";
import { buildMetadata, JsonLd, breadcrumbSchema } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ContactForm } from "@/components/marketing/contact-form";
import { Panel } from "@/components/ui/primitives";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = buildMetadata({
  title: "Contact the Investment Team",
  description:
    "Ask about mandates, verification, deposits, fees or custody. The investment team replies within one business day.",
  path: "/contact",
});

const CHANNELS = [
  {
    icon: Mail,
    title: "Investment enquiries",
    value: siteConfig.contact.email,
    href: `mailto:${siteConfig.contact.email}`,
    note: "Choosing a mandate, minimums, allocation questions",
  },
  {
    icon: ShieldQuestion,
    title: "Account support",
    value: siteConfig.contact.support,
    href: `mailto:${siteConfig.contact.support}`,
    note: "Verification, deposits, withdrawals, access issues",
  },
  {
    icon: ShieldQuestion,
    title: "Compliance",
    value: siteConfig.contact.compliance,
    href: `mailto:${siteConfig.contact.compliance}`,
    note: "Data requests, source-of-funds queries, complaints",
  },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact Axiom Capital",
            url: `${siteConfig.url}/contact`,
          },
        ]}
      />

      <Section className="pt-36 md:pt-44">
        <SectionHeading
          eyebrow="Contact"
          title="Ask before you commit anything."
          description="A real person on the investment team reads every message. If a mandate is wrong for you, we would rather say so now than manage money you should not have invested."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <Reveal>
            <ContactForm />
          </Reveal>

          <Reveal delay={0.1}>
            <div className="space-y-6">
              <Panel className="divide-y divide-line">
                {CHANNELS.map((channel) => (
                  <div key={channel.title} className="flex gap-4 p-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line-bright bg-surface-2 text-brand">
                      <channel.icon className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">
                        {channel.title}
                      </p>
                      <a
                        href={channel.href}
                        className="mt-0.5 block truncate text-[13.5px] text-brand-bright transition-colors hover:text-mint"
                      >
                        {channel.value}
                      </a>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-faint">
                        {channel.note}
                      </p>
                    </div>
                  </div>
                ))}
              </Panel>

              <Panel className="p-5">
                <div className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line-bright bg-surface-2 text-mint">
                    <Clock className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">
                      Response times
                    </p>
                    <ul className="mt-2 space-y-1.5 text-[13px] text-ink-muted">
                      <li>Investment enquiries — 1 business day</li>
                      <li>Account support — same business day</li>
                      <li>Withdrawal reviews — same business day</li>
                      <li>Compliance and data requests — 5 business days</li>
                    </ul>
                  </div>
                </div>
              </Panel>

              <Panel className="p-5">
                <div className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line-bright bg-surface-2 text-ink-muted">
                    <MapPin className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">
                      Registered office
                    </p>
                    <address className="mt-2 text-[13px] not-italic leading-relaxed text-ink-muted">
                      {siteConfig.legalName}
                      <br />
                      {siteConfig.contact.address.street}
                      <br />
                      {siteConfig.contact.address.city}{" "}
                      {siteConfig.contact.address.postalCode}
                      <br />
                      {siteConfig.contact.address.country}
                    </address>
                  </div>
                </div>
              </Panel>

              <p className="text-[12.5px] leading-relaxed text-ink-faint">
                Axiom will never ask for your password, a one-time code, or
                remote access to your device. If you receive a message claiming
                otherwise, forward it to{" "}
                <a
                  href="mailto:security@axiomcapital.example"
                  className="text-brand-bright hover:text-mint"
                >
                  security@axiomcapital.example
                </a>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="border-t border-line">
        <Reveal>
          <p className="text-center text-[14px] text-ink-muted">
            Most questions are already answered on the{" "}
            <Link href="/faq" className="text-brand-bright hover:text-mint">
              FAQ page
            </Link>
            , and the{" "}
            <Link href="/legal/risk-disclosure" className="text-brand-bright hover:text-mint">
              risk disclosure
            </Link>{" "}
            covers what can go wrong.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
