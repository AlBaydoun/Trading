import Link from "next/link";
import { ArrowUpRight, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, transactionBlockReason } from "@/lib/auth/guards";
import { getAvailableCash } from "@/lib/operations/money";
import { toNumber, formatMoney, formatDate, formatPercent } from "@/lib/money";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import { ButtonLink } from "@/components/ui/button";
import {
  Alert,
  Badge,
  Delta,
  EmptyState,
  Panel,
  PanelHeader,
  Stat,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { InvestDialog, type InvestPlan } from "@/components/dashboard/invest-dialog";
import { ClosePositionButton } from "@/components/dashboard/close-position-button";

export default async function InvestmentsPage() {
  const user = await requireUser();

  const [available, plans, positions, closed] = await Promise.all([
    getAvailableCash(user.id),
    prisma.investmentPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.investment.findMany({
      where: { userId: user.id, status: { in: ["ACTIVE", "MATURED"] } },
      include: { plan: true, accruals: { orderBy: { periodEnd: "desc" }, take: 4 } },
      orderBy: { startedAt: "desc" },
    }),
    prisma.investment.findMany({
      where: { userId: user.id, status: { in: ["CLOSED", "CANCELLED"] } },
      include: { plan: { select: { name: true } } },
      orderBy: { closedAt: "desc" },
      take: 10,
    }),
  ]);

  const blocked = transactionBlockReason(user);
  const availableNumber = toNumber(available);

  const totalValue = positions.reduce((s, p) => s + toNumber(p.currentValue), 0);
  const totalPrincipal = positions.reduce((s, p) => s + toNumber(p.principal), 0);
  const totalPnl = totalValue - totalPrincipal;

  return (
    <>
      <PageHeader
        title="Investments"
        description="Allocate cash to a mandate, watch each accrual land, and close whenever the lock-up allows."
        action={
          <ButtonLink href="/dashboard/deposit" variant="secondary" size="sm">
            <Wallet className="size-4" />
            Add funds
          </ButtonLink>
        }
      />

      <div className="space-y-6">
        {blocked && (
          <Alert tone="gold" title="You cannot allocate yet">
            {blocked}{" "}
            {user.kycStatus !== "APPROVED" && (
              <Link href="/dashboard/verification" className="font-medium underline">
                Complete verification
              </Link>
            )}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Available cash" value={formatMoney(available)} sub="ready to allocate" />
          <Stat
            label="Allocated"
            value={formatMoney(totalValue)}
            sub={`${positions.length} open position${positions.length === 1 ? "" : "s"}`}
            tone="brand"
          />
          <Stat
            label="Unrealised P&L"
            value={formatMoney(totalPnl, "USD", { signed: true })}
            delta={totalPrincipal > 0 ? (totalPnl / totalPrincipal) * 100 : undefined}
            tone={totalPnl >= 0 ? "mint" : "loss"}
          />
        </div>

        {/* ------------------------------------------ open positions --- */}
        <Panel>
          <PanelHeader
            title="Open positions"
            description="Each accrual is an itemised entry — never a single moving number."
          />
          {positions.length === 0 ? (
            <EmptyState
              title="No open positions"
              description="Choose a mandate below to put your cash to work."
            />
          ) : (
            <ul className="divide-y divide-line">
              {positions.map((position) => {
                const principal = toNumber(position.principal);
                const value = toNumber(position.currentValue);
                const pnl = value - principal;
                const pnlPct = principal > 0 ? (pnl / principal) * 100 : 0;
                const isEarly =
                  position.maturesAt !== null &&
                  position.maturesAt.getTime() > Date.now();

                return (
                  <li key={position.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-display text-[17px] font-semibold text-ink">
                            {position.plan.name}
                          </h3>
                          <StatusPill status={position.status} />
                          {isEarly && <Badge tone="gold">Locked</Badge>}
                        </div>
                        <p className="mt-1 font-mono text-[11.5px] text-ink-faint">
                          {position.reference} · opened {formatDate(position.startedAt)}
                          {position.maturesAt && ` · unlocks ${formatDate(position.maturesAt)}`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-6">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                            Principal
                          </p>
                          <p className="font-mono text-[14px] tabular-nums text-ink-muted">
                            {formatMoney(principal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                            Value
                          </p>
                          <p className="font-mono text-[16px] font-semibold tabular-nums text-ink">
                            {formatMoney(value)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                            P&amp;L
                          </p>
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`font-mono text-[14px] tabular-nums ${pnl >= 0 ? "text-mint" : "text-loss"}`}
                            >
                              {pnl >= 0 ? "+" : "−"}
                              {formatMoney(Math.abs(pnl))}
                            </span>
                            <Delta value={pnlPct} showArrow={false} className="text-[12px]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {position.accruals.length > 0 && (
                      <div className="mt-4 rounded-xl border border-line bg-surface-2/50 p-3.5">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                          Recent accruals
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {position.accruals.map((accrual) => {
                            const amount = toNumber(accrual.amount);
                            return (
                              <li
                                key={accrual.id}
                                className="flex items-center justify-between gap-4 text-[12.5px]"
                              >
                                <span className="text-ink-muted">
                                  Period to {formatDate(accrual.periodEnd)}
                                  <span className="ml-2 font-mono text-ink-faint">
                                    {formatPercent(toNumber(accrual.ratePct))}
                                  </span>
                                </span>
                                <span
                                  className={`font-mono tabular-nums ${amount >= 0 ? "text-mint" : "text-loss"}`}
                                >
                                  {amount >= 0 ? "+" : "−"}
                                  {formatMoney(Math.abs(amount))}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                      <Link
                        href={`/plans/${position.plan.slug}`}
                        className="inline-flex items-center gap-1.5 text-[13px] text-brand-bright hover:text-mint"
                      >
                        Mandate details
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                      <ClosePositionButton
                        investmentId={position.id}
                        currentValue={value}
                        earlyExitFeePct={toNumber(position.plan.earlyExitFeePct)}
                        performanceFeePct={toNumber(position.plan.performanceFeePct)}
                        profit={pnl}
                        isEarly={isEarly}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* ------------------------------------------------- mandates --- */}
        <Panel>
          <PanelHeader
            title="Available mandates"
            description="Fees, lock-up and expected drawdown are published on every plan page before you commit."
          />
          <ul className="divide-y divide-line">
            {plans.map((plan) => {
              const investPlan: InvestPlan = {
                id: plan.id,
                name: plan.name,
                tagline: plan.tagline,
                minimumAmount: toNumber(plan.minimumAmount),
                maximumAmount: plan.maximumAmount ? toNumber(plan.maximumAmount) : null,
                targetApyLow: toNumber(plan.targetApyLow),
                targetApyHigh: toNumber(plan.targetApyHigh),
                lockupDays: plan.lockupDays,
                managementFeePct: toNumber(plan.managementFeePct),
                performanceFeePct: toNumber(plan.performanceFeePct),
                earlyExitFeePct: toNumber(plan.earlyExitFeePct),
                riskLevel: plan.riskLevel,
              };

              const affordable = availableNumber >= investPlan.minimumAmount;

              return (
                <li
                  key={plan.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-display text-[16px] font-semibold text-ink">
                        {plan.name}
                      </h3>
                      <Badge
                        tone={
                          plan.riskLevel === "LOW"
                            ? "mint"
                            : plan.riskLevel === "MODERATE"
                              ? "brand"
                              : plan.riskLevel === "HIGH"
                                ? "gold"
                                : "loss"
                        }
                      >
                        {plan.riskLevel.replace("_", " ").toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[13.5px] text-ink-muted">{plan.tagline}</p>
                    <p className="mt-1.5 font-mono text-[12px] tabular-nums text-ink-faint">
                      Target {investPlan.targetApyLow.toFixed(0)}–
                      {investPlan.targetApyHigh.toFixed(0)}% · min{" "}
                      {formatMoney(investPlan.minimumAmount)} ·{" "}
                      {plan.lockupDays === 0 ? "no lock-up" : `${plan.lockupDays}d lock-up`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {!affordable && !blocked && (
                      <span className="text-[12px] text-ink-faint">
                        Needs {formatMoney(investPlan.minimumAmount - availableNumber)} more
                      </span>
                    )}
                    <InvestDialog
                      plan={investPlan}
                      availableCash={availableNumber}
                      disabled={Boolean(blocked) || !affordable}
                      disabledReason={blocked ?? "Insufficient available cash"}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* --------------------------------------------------- closed --- */}
        {closed.length > 0 && (
          <Panel>
            <PanelHeader title="Closed positions" />
            <Table>
              <thead>
                <tr>
                  <Th>Mandate</Th>
                  <Th>Reference</Th>
                  <Th align="right">Principal</Th>
                  <Th align="right">Realised P&amp;L</Th>
                  <Th align="right">Fees</Th>
                  <Th align="right">Closed</Th>
                </tr>
              </thead>
              <tbody>
                {closed.map((position) => {
                  const pnl = toNumber(position.realisedPnl);
                  return (
                    <tr key={position.id}>
                      <Td>{position.plan.name}</Td>
                      <Td mono className="text-ink-faint">{position.reference}</Td>
                      <Td align="right" mono>{formatMoney(position.principal)}</Td>
                      <Td align="right" mono className={pnl >= 0 ? "text-mint" : "text-loss"}>
                        {pnl >= 0 ? "+" : "−"}
                        {formatMoney(Math.abs(pnl))}
                      </Td>
                      <Td align="right" mono className="text-ink-muted">
                        {formatMoney(position.feesPaid)}
                      </Td>
                      <Td align="right" className="text-ink-muted">
                        {formatDate(position.closedAt)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Panel>
        )}
      </div>
    </>
  );
}
