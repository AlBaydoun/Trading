import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge, Meter } from "@/components/ui/primitives";
import { TiltCard } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export interface PlanCardData {
  slug: string;
  name: string;
  tagline: string;
  minimumAmount: number;
  targetApyLow: number;
  targetApyHigh: number;
  lockupDays: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  payoutFrequency: string;
  highlights: string[];
  allocation: { label: string; percent: number; kind: string }[];
  isFeatured: boolean;
}

const RISK_META: Record<
  PlanCardData["riskLevel"],
  { label: string; tone: "mint" | "brand" | "gold" | "loss"; score: number }
> = {
  LOW: { label: "Lower risk", tone: "mint", score: 25 },
  MODERATE: { label: "Moderate risk", tone: "brand", score: 50 },
  HIGH: { label: "Higher risk", tone: "gold", score: 75 },
  VERY_HIGH: { label: "Speculative", tone: "loss", score: 100 },
};

const PAYOUT_LABEL: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ON_MATURITY: "At maturity",
};

const ALLOCATION_COLORS = [
  "var(--color-brand)",
  "var(--color-mint)",
  "var(--color-violet)",
  "var(--color-gold)",
  "var(--color-brand-deep)",
  "var(--color-line-bright)",
];

export function PlanCard({
  plan,
  className,
}: {
  plan: PlanCardData;
  className?: string;
}) {
  const risk = RISK_META[plan.riskLevel];

  return (
    <TiltCard className={cn("h-full", className)} intensity={5}>
      <article
        className={cn(
          "panel group relative flex h-full flex-col p-6 transition-[border-color,box-shadow] duration-500",
          plan.isFeatured
            ? "border-brand/40 shadow-[0_0_0_1px_rgba(91,140,255,0.18),0_30px_80px_-50px_rgba(91,140,255,0.6)]"
            : "hover:border-line-bright",
        )}
      >
        {plan.isFeatured && (
          <div className="absolute right-5 top-5">
            <Badge tone="brand" dot>
              Most chosen
            </Badge>
          </div>
        )}

        <Badge tone={risk.tone} className="w-fit">
          {risk.label}
        </Badge>

        <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
          {plan.name}
        </h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">
          {plan.tagline}
        </p>

        {/* The headline number. Framed as a target, never as a return. */}
        <div className="mt-6 border-y border-line py-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            Target annual return
          </p>
          <p className="mt-1.5 font-mono text-[34px] font-semibold leading-none tabular-nums text-ink">
            {plan.targetApyLow.toFixed(0)}
            <span className="text-ink-faint">–</span>
            {plan.targetApyHigh.toFixed(0)}
            <span className="ml-1 text-xl text-ink-muted">%</span>
          </p>
          <p className="mt-2 text-[11.5px] text-ink-faint">
            An objective, not a guarantee. Capital is at risk.
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <dt className="text-ink-faint">Minimum</dt>
            <dd className="mt-0.5 font-mono font-medium tabular-nums text-ink">
              ${plan.minimumAmount.toLocaleString("en-US")}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Lock-up</dt>
            <dd className="mt-0.5 font-mono font-medium tabular-nums text-ink">
              {plan.lockupDays === 0 ? "None" : `${plan.lockupDays} days`}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Payout</dt>
            <dd className="mt-0.5 font-medium text-ink">
              {PAYOUT_LABEL[plan.payoutFrequency] ?? plan.payoutFrequency}
            </dd>
          </div>
          <div>
            <dt className="text-ink-faint">Risk level</dt>
            <dd className="mt-1.5">
              <Meter value={risk.score} tone={risk.tone} label={risk.label} />
            </dd>
          </div>
        </dl>

        {plan.allocation.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Allocation
            </p>
            {/* Single stacked bar — reads faster than a legend-heavy donut at
                card size, and stays legible down to 280px wide. */}
            <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-surface-3">
              {plan.allocation.map((slice, index) => (
                <span
                  key={slice.label}
                  style={{
                    width: `${slice.percent}%`,
                    background: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
                  }}
                  title={`${slice.label} ${slice.percent}%`}
                />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {plan.allocation.slice(0, 4).map((slice, index) => (
                <li
                  key={slice.label}
                  className="flex items-center gap-1.5 text-[11.5px] text-ink-muted"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{
                      background: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
                    }}
                  />
                  {slice.label}
                  <span className="font-mono tabular-nums text-ink-faint">
                    {slice.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="mt-6 space-y-2">
          {plan.highlights.slice(0, 3).map((highlight) => (
            <li
              key={highlight}
              className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-muted"
            >
              <svg viewBox="0 0 14 14" className="mt-1 size-3 shrink-0 text-mint" aria-hidden="true">
                <path
                  d="M2.5 7.5 L5.5 10.5 L11.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {highlight}
            </li>
          ))}
        </ul>

        <Link
          href={`/plans/${plan.slug}`}
          className="mt-auto flex items-center justify-between gap-2 pt-7 text-[14px] font-medium text-brand-bright transition-colors hover:text-mint"
        >
          <span className="absolute inset-0" aria-hidden="true" />
          View mandate details
          <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </article>
    </TiltCard>
  );
}
