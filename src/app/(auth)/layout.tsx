import Link from "next/link";
import { ArrowLeft, Landmark, ScrollText, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { siteConfig } from "@/lib/site-config";

const ASSURANCES = [
  {
    icon: Landmark,
    title: "Segregated client accounts",
    body: "Your money is held apart from ours and reconciled daily.",
  },
  {
    icon: ScrollText,
    title: "Every entry visible",
    body: "Double-entry ledger. Each balance traces to the journal that produced it.",
  },
  {
    icon: ShieldCheck,
    title: "No obligation to fund",
    body: "Open the account, look around, decide afterwards.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      {/* ------------------------------------------------------- form --- */}
      <div className="relative flex flex-col px-5 py-8 md:px-10 lg:px-14">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="size-8" />
            <span className="font-display text-[17px] font-semibold tracking-tight">
              {siteConfig.shortName}
              <span className="text-ink-faint"> Capital</span>
            </span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-[13px] text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" />
            Back to site
          </Link>
        </div>

        <main id="main" className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>

        <p className="text-center text-[11.5px] leading-relaxed text-ink-faint">
          Investing puts your capital at risk. Read the{" "}
          <Link href="/legal/risk-disclosure" className="text-ink-muted hover:text-brand">
            risk disclosure
          </Link>{" "}
          before you fund an account.
        </p>
      </div>

      {/* ------------------------------------------------------ aside --- */}
      <aside className="relative hidden overflow-hidden border-l border-line bg-abyss lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="grid-backdrop pointer-events-none absolute inset-0" />
        <div
          className="pointer-events-none absolute -right-40 top-1/4 size-[600px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle, rgba(91,140,255,0.20) 0%, rgba(139,92,246,0.10) 40%, transparent 70%)",
          }}
        />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
            {siteConfig.tagline}
          </p>
          <p className="mt-6 max-w-md font-display text-[30px] font-semibold leading-[1.18] tracking-tight text-ink">
            Start with the amount you would be comfortable losing.
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">
            It is the honest way to begin, and it is how we would open an account
            ourselves.
          </p>
        </div>

        <ul className="relative space-y-6">
          {ASSURANCES.map((item) => (
            <li key={item.title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line-bright bg-surface text-mint">
                <item.icon className="size-4.5" />
              </span>
              <div>
                <p className="text-[14px] font-medium text-ink">{item.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
