import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/session";
import { toNumber, formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/dashboard/page-header";
import { TogglePlanForm } from "@/components/admin/reverse-entry-form";
import {
  Alert,
  Badge,
  Panel,
  PanelHeader,
  Stat,
} from "@/components/ui/primitives";

const RISK_TONE = {
  LOW: "mint",
  MODERATE: "brand",
  HIGH: "gold",
  VERY_HIGH: "loss",
} as const;

export default async function AdminPlansPage() {
  const actor = await requireAdmin();
  const canApprove = hasRole(actor.role, "ADMIN");

  const plans = await prisma.investmentPlan.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { investments: true } },
      investments: {
        where: { status: { in: ["ACTIVE", "MATURED"] } },
        select: { principal: true, currentValue: true },
      },
    },
  });

  const totalAllocated = plans.reduce(
    (sum, plan) =>
      sum + plan.investments.reduce((s, i) => s + toNumber(i.currentValue), 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Mandates"
        description="Open or close each mandate to new allocations. Existing positions keep the terms they were opened under."
      />

      <div className="space-y-6">
        <Alert tone="brand">
          Mandate terms — fees, minimums, lock-up and allocation — are seeded from{" "}
          <code className="font-mono text-[12.5px]">prisma/seed-data/plans.ts</code>{" "}
          and edited there. Changing published terms on a live product affects
          what investors were shown when they committed, so it deliberately
          requires a deploy rather than a form.
        </Alert>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Mandates" value={plans.length} sub={`${plans.filter((p) => p.isActive).length} open`} />
          <Stat label="Total allocated" value={formatMoney(totalAllocated)} tone="brand" />
          <Stat
            label="Positions"
            value={plans.reduce((sum, p) => sum + p._count.investments, 0)}
            sub="all time"
          />
        </div>

        <Panel>
          <PanelHeader title="All mandates" />
          <ul className="divide-y divide-line">
            {plans.map((plan) => {
              const allocated = plan.investments.reduce(
                (sum, i) => sum + toNumber(i.currentValue),
                0,
              );
              const principal = plan.investments.reduce(
                (sum, i) => sum + toNumber(i.principal),
                0,
              );
              const pnl = allocated - principal;

              return (
                <li key={plan.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-display text-[17px] font-semibold text-ink">
                          {plan.name}
                        </h3>
                        <Badge tone={RISK_TONE[plan.riskLevel]}>
                          {plan.riskLevel.replace("_", " ").toLowerCase()}
                        </Badge>
                        {plan.isFeatured && <Badge tone="brand">featured</Badge>}
                        <Badge tone={plan.isActive ? "mint" : "outline"} dot={plan.isActive}>
                          {plan.isActive ? "open" : "closed"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[13.5px] text-ink-muted">{plan.tagline}</p>

                      <dl className="mt-3 grid gap-x-8 gap-y-1.5 font-mono text-[12px] sm:grid-cols-3">
                        <Row
                          label="Target"
                          value={`${toNumber(plan.targetApyLow).toFixed(0)}–${toNumber(plan.targetApyHigh).toFixed(0)}%`}
                        />
                        <Row label="Minimum" value={formatMoney(plan.minimumAmount)} />
                        <Row
                          label="Maximum"
                          value={plan.maximumAmount ? formatMoney(plan.maximumAmount) : "no cap"}
                        />
                        <Row
                          label="Lock-up"
                          value={plan.lockupDays === 0 ? "none" : `${plan.lockupDays}d`}
                        />
                        <Row label="Mgmt fee" value={`${toNumber(plan.managementFeePct).toFixed(2)}%`} />
                        <Row label="Perf fee" value={`${toNumber(plan.performanceFeePct).toFixed(0)}%`} />
                        <Row label="Exit fee" value={`${toNumber(plan.earlyExitFeePct).toFixed(2)}%`} />
                        <Row label="Payout" value={plan.payoutFrequency.replace(/_/g, " ").toLowerCase()} />
                        <Row label="Positions" value={String(plan._count.investments)} />
                      </dl>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                        Allocated
                      </p>
                      <p className="font-mono text-xl font-semibold tabular-nums text-ink">
                        {formatMoney(allocated)}
                      </p>
                      {principal > 0 && (
                        <p
                          className={`font-mono text-[12px] tabular-nums ${pnl >= 0 ? "text-mint" : "text-loss"}`}
                        >
                          {pnl >= 0 ? "+" : "−"}
                          {formatMoney(Math.abs(pnl))} vs principal
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <TogglePlanForm
                      planId={plan.id}
                      isActive={plan.isActive}
                      canApprove={canApprove}
                    />
                    <Link
                      href={`/plans/${plan.slug}`}
                      className="inline-flex items-center gap-1.5 text-[13px] text-brand-bright hover:text-mint"
                    >
                      Public page
                      <ExternalLink className="size-3.5" />
                    </Link>
                    <Link
                      href={`/admin/investments?plan=${plan.slug}`}
                      className="text-[13px] text-ink-muted hover:text-ink"
                    >
                      Positions →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-faint">{label}</dt>
      <dd className="capitalize text-ink-muted">{value}</dd>
    </div>
  );
}
