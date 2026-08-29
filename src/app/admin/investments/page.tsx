import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/session";
import { toNumber, formatMoney, formatDate, formatPercent } from "@/lib/money";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import {
  AccrualForm,
  AdminClosePositionForm,
} from "@/components/admin/accrual-form";
import {
  EmptyState,
  Panel,
  PanelHeader,
  Stat,
} from "@/components/ui/primitives";

export default async function AdminInvestmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const actor = await requireAdmin();
  const canApprove = hasRole(actor.role, "ADMIN");
  const { plan: planSlug } = await searchParams;

  const [positions, plans, totals] = await Promise.all([
    prisma.investment.findMany({
      where: {
        status: { in: ["ACTIVE", "MATURED"] },
        ...(planSlug ? { plan: { slug: planSlug } } : {}),
      },
      include: {
        plan: { select: { name: true, slug: true, payoutFrequency: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        accruals: { orderBy: { periodEnd: "desc" }, take: 3 },
      },
      orderBy: [{ lastAccrualAt: "asc" }, { startedAt: "asc" }],
    }),
    prisma.investmentPlan.findMany({
      select: { slug: true, name: true, _count: { select: { investments: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.investment.aggregate({
      where: { status: { in: ["ACTIVE", "MATURED"] } },
      _sum: { principal: true, currentValue: true },
      _count: true,
    }),
  ]);

  const principal = toNumber(totals._sum.principal ?? 0);
  const value = toNumber(totals._sum.currentValue ?? 0);

  return (
    <>
      <PageHeader
        title="Positions"
        description="Post period returns and close positions. Every accrual writes an itemised entry the investor can see, with the rate that produced it."
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Open positions" value={totals._count} />
          <Stat label="Principal" value={formatMoney(principal)} />
          <Stat
            label="Current value"
            value={formatMoney(value)}
            delta={principal > 0 ? ((value - principal) / principal) * 100 : undefined}
            tone={value >= principal ? "mint" : "loss"}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/investments"
            className={`rounded-full border px-3 py-1.5 text-[12.5px] transition-colors ${
              !planSlug
                ? "border-mint/50 bg-mint/12 text-mint"
                : "border-line-bright text-ink-muted hover:text-ink"
            }`}
          >
            All ({totals._count})
          </Link>
          {plans.map((plan) => (
            <Link
              key={plan.slug}
              href={`/admin/investments?plan=${plan.slug}`}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] transition-colors ${
                planSlug === plan.slug
                  ? "border-mint/50 bg-mint/12 text-mint"
                  : "border-line-bright text-ink-muted hover:text-ink"
              }`}
            >
              {plan.name} ({plan._count.investments})
            </Link>
          ))}
        </div>

        <Panel>
          <PanelHeader
            title={`${positions.length} open position${positions.length === 1 ? "" : "s"}`}
            description="Sorted by how long since the last accrual — the top of this list is what is overdue."
          />
          {positions.length === 0 ? (
            <EmptyState title="No open positions" />
          ) : (
            <ul className="divide-y divide-line">
              {positions.map((position) => {
                const positionPrincipal = toNumber(position.principal);
                const positionValue = toNumber(position.currentValue);
                const pnl = positionValue - positionPrincipal;
                const pnlPct = positionPrincipal > 0 ? (pnl / positionPrincipal) * 100 : 0;

                const daysSinceAccrual = position.lastAccrualAt
                  ? Math.floor((Date.now() - position.lastAccrualAt.getTime()) / 86_400_000)
                  : Math.floor((Date.now() - position.startedAt.getTime()) / 86_400_000);

                return (
                  <li key={position.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Link
                            href={`/admin/users/${position.user.id}`}
                            className="font-medium text-ink hover:text-brand-bright"
                          >
                            {position.user.firstName} {position.user.lastName}
                          </Link>
                          <span className="text-[13px] text-ink-muted">
                            {position.plan.name}
                          </span>
                          <StatusPill status={position.status} />
                        </div>
                        <p className="mt-1 font-mono text-[11.5px] text-ink-faint">
                          {position.reference} · opened {formatDate(position.startedAt)}
                          {position.maturesAt && ` · matures ${formatDate(position.maturesAt)}`}
                          {" · "}
                          <span className={daysSinceAccrual > 35 ? "text-gold" : ""}>
                            {daysSinceAccrual}d since last accrual
                          </span>
                        </p>

                        {position.accruals.length > 0 && (
                          <ul className="mt-2.5 flex flex-wrap gap-2">
                            {position.accruals.map((accrual) => {
                              const amount = toNumber(accrual.amount);
                              return (
                                <li
                                  key={accrual.id}
                                  className="rounded-lg border border-line bg-surface-2/60 px-2.5 py-1 font-mono text-[11px]"
                                >
                                  <span className={amount >= 0 ? "text-mint" : "text-loss"}>
                                    {amount >= 0 ? "+" : "−"}
                                    {formatMoney(Math.abs(amount))}
                                  </span>
                                  <span className="ml-1.5 text-ink-faint">
                                    {formatPercent(toNumber(accrual.ratePct))} ·{" "}
                                    {formatDate(accrual.periodEnd)}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                            Principal
                          </p>
                          <p className="font-mono text-[13px] tabular-nums text-ink-muted">
                            {formatMoney(positionPrincipal)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                            Value
                          </p>
                          <p className="font-mono text-lg font-semibold tabular-nums text-ink">
                            {formatMoney(positionValue)}
                          </p>
                          <p
                            className={`font-mono text-[11.5px] tabular-nums ${pnl >= 0 ? "text-mint" : "text-loss"}`}
                          >
                            {pnl >= 0 ? "+" : "−"}
                            {formatMoney(Math.abs(pnl))} ({formatPercent(pnlPct)})
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-start gap-3">
                      <AccrualForm
                        investmentId={position.id}
                        currentValue={positionValue}
                        canApprove={canApprove}
                      />
                      <AdminClosePositionForm
                        investmentId={position.id}
                        canApprove={canApprove}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
