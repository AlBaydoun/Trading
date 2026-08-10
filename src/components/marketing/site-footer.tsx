import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { Logo } from "@/components/marketing/logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Invest",
    links: [
      { label: "Investment plans", href: "/plans" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Live markets", href: "/markets" },
      { label: "Open an account", href: "/register" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Security & custody", href: "/security" },
      { label: "Insights", href: "/insights" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Fees", href: "/legal/fees" },
      { label: "Sign in", href: "/login" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of service", href: "/legal/terms" },
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Risk disclosure", href: "/legal/risk-disclosure" },
      { label: "AML policy", href: "/legal/aml" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line bg-abyss">
      <div className="dot-backdrop pointer-events-none absolute inset-0 opacity-[0.35]" />

      <div className="container-page relative">
        <div className="grid gap-12 py-16 lg:grid-cols-[1.4fr_2.6fr]">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="size-8" />
              <span className="font-display text-[17px] font-semibold tracking-tight">
                {siteConfig.shortName}
                <span className="text-ink-faint"> Capital</span>
              </span>
            </Link>

            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              {siteConfig.tagline}. Every position, fee and basis point visible
              in one account.
            </p>

            <address className="mt-6 space-y-1 text-[13px] not-italic text-ink-faint">
              <p>{siteConfig.contact.address.street}</p>
              <p>
                {siteConfig.contact.address.city},{" "}
                {siteConfig.contact.address.postalCode}
              </p>
              <p>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="transition-colors hover:text-brand"
                >
                  {siteConfig.contact.email}
                </a>
              </p>
            </address>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[13.5px] text-ink-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/*
          Risk warning sits above the copyright, at readable size rather than
          hidden in 9px grey. If a product carries this much risk, saying so
          plainly is both the regulatory expectation and the honest choice.
        */}
        <div className="rounded-2xl border border-gold/25 bg-gold/[0.05] px-5 py-4">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.12em] text-gold">
            Risk warning
          </p>
          <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-ink-muted">
            Investing puts your capital at risk. The value of investments can
            fall as well as rise and you may get back less than you put in.
            Cryptoassets are highly volatile and largely unregulated in many
            jurisdictions; they are not covered by investor compensation
            schemes. Target returns are objectives, not guarantees, and past
            performance does not predict future results. Nothing on this site is
            personal financial advice — seek independent advice if you are
            unsure.
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-line py-8 md:flex-row md:items-center md:justify-between">
          <p className="text-[12.5px] text-ink-faint">
            © {year} {siteConfig.legalName}. {siteConfig.registration}.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-ink-faint">
            <Link href="/legal/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/legal/cookies" className="transition-colors hover:text-ink">
              Cookies
            </Link>
            <Link href="/sitemap.xml" className="transition-colors hover:text-ink">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
