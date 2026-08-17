import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  Bell,
  LineChart as LineChartIcon,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser, transactionBlockReason } from "@/lib/auth/guards";
import { getPortfolioSummary, getAvailableCash } from "@/lib/operations/money";
import { toNumber, formatMoney, formatDate, formatRelativeTime } from "@/lib/money";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import { ButtonLink } from "@/components/ui/button";
import {
  Alert,
  Delta,
  EmptyState,
  Meter,
  Panel,
  PanelHeader,
  Stat,
} from "@/components/ui/primitives";
import { LineChart, DonutChart } from "@/components/ui/sparkline";

const SLICE_COLORS = [
  "var(--color-brand)",
  "var(--color-mint)",
  "var(--color-violet)",
  "var(--color-gold)",
  "var(--color-brand-deep)",
  "var(--color-line-bright)",
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { welcome, error } = await searchParams;

  const [summary, available, transactions, notifications, pending] =
    await Promise.all([
      getPortfolioSummary(user.id),
      getAvailableCash(user.id),
      prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.$transaction([
        prisma.depositRequest.count({
          where: { userId: user.id, status: { in: ["PENDING", "UNDER_REVIEW"] } },
        }),
        prisma.withdrawalRequest.count({
          where: { userId: user.id, status: { in: ["PENDING", "UNDER_REVIEW"] } },
        }),
      ]),
    ]);

  const blocked = transactionBlockReason(user);
  const totalValue = toNumber(summary.totalValue);
  const totalDeposited = toNumber(summary.totalDeposited);
  const roi = toNumber(summary.roiPct);

  // Portfolio value history, reconstructed by walking the transaction ledger
  // backwards from the current balance — a real series, not decoration.
  const history = await buildValueHistory(user.id, totalValue);

  const allocation = summary.investments.map((investment, index) => ({
    label: investment.plan.name,
    value: toNumber(investment.currentValue),
    color: SLICE_COLORS[index % SLICE_COLORS.length],
  }));

  const cashSlice = toNumber(summary.cash);
  if (cashSlice > 0) {
    allocation.push({
      label: "Cash",
      value: cashSlice,
      color: "var(--color-surface-3)",
    });
  }

  return (
    <>
      <PageHeader
        title={`Good to see you, ${user.firstName}`}
        description="Everything below is derived from your ledger. Every figure traces back to a journal entry you can open."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/dashboard/deposit" size="sm" variant="secondary">
              <ArrowDownToLine className="size-4" />
              Deposit
            </ButtonLink>
            <ButtonLink href="/dashboard/investments" size="sm">
              Invest
              <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
        }
      />

      <div className="space-y-6">
        {welcome && (
          <Alert tone="mint" title="Your account is open">
            Next step is identity verification — it takes a few minutes and
            unlocks deposits and investing.{" "}
            <Link href="/dashboard/verification" className="font-medium underline">
              Verify now
            </Link>
            .
          </Alert>
        )}

        {error === "insufficient-permissions" && (
          <Alert tone="loss" title="Not permitted">
            Your account does not have access to that area.
          </Alert>
        )}

        {blocked && !welcome && (
          <Alert tone="gold" title="Transfers are on hold">
            {blocked}{" "}
            {user.kycStatus !== "APPROVED" && (
              <Link href="/dashboard/verification" className="font-medium underline">
                Complete verification
              </Link>
            )}
          </Alert>
        )}

        {/* --------------------------------------------------- stats --- */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Portfolio value"
            value={formatMoney(totalValue)}
            delta={totalDeposited > 0 ? roi : undefined}
            sub={totalDeposited > 0 ? "since first deposit" : "fund your account to begin"}
            tone="brand"
          />
          <Stat
            label="Available cash"
            value={formatMoney(available)}
            sub={
              pending[1] > 0
                ? `${pending[1]} withdrawal${pending[1] > 1 ? "s" : ""} on hold`
                : "ready to invest or withdraw"
            }
          />
          <Stat
            label="Allocated"
            value={formatMoney(summary.invested)}
            sub={`${summary.openPositions} open position${summary.openPositions === 1 ? "" : "s"}`}
          />
          <Stat
            label="Returns credited"
            value={formatMoney(summary.totalReturns, "USD", { signed: true })}
            sub="lifetime, net of losses"
            tone={toNumber(summary.totalReturns) >= 0 ? "mint" : "loss"}
          />
        </div>

        {pending[0] > 0 && (
          <Alert tone="brand">
            You have {pending[0]} deposit{pending[0] > 1 ? "s" : ""} awaiting
            confirmation. We credit funds as soon as operations matches the
            payment to your reference.
          </Alert>
        )}

        {/* --------------------------------------------- chart + mix --- */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Panel>
            <PanelHeader
              title="Portfolio value"
              description="Reconstructed from your transaction history."
              action={
                totalDeposited > 0 ? (
                  <Delta value={roi} className="text-[14px]" />
                ) : null
              }
            />
            <div className="p-5">
              {history.values.length > 1 ? (
                <LineChart
                  data={history.values}
                  labels={history.labels}
                  height={240}
                  format={(n) => formatMoney(n, "USD", { compact: true })}
                  accent={roi >= 0 ? "mint" : "brand"}
                />
              ) : (
                <EmptyState
                  icon={<LineChartIcon className="size-5" />}
                  title="No history yet"
                  description="Once you fund your account and allocate to a mandate, your value over time appears here."
                  action={
                    <ButtonLink href="/dashboard/deposit" size="sm">
                      Make a deposit
                    </ButtonLink>
                  }
                />
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Allocation" description="Where your capital sits right now." />
            <div className="p-5">
              {allocation.length > 0 ? (
                <>
                  <div className="flex justify-center">
                    <DonutChart
                      segments={allocation}
                      size={172}
                      thickness={20}
                      centerValue={formatMoney(totalValue, "USD", { compact: true })}
                      centerLabel="total"
                    />
                  </div>
                  <ul className="mt-6 space-y-3">
                    {allocation.map((slice) => (
                      <li key={slice.label}>
                        <div className="flex items-center justify-between gap-3 text-[13px]">
                          <span className="flex min-w-0 items-center gap-2 text-ink-muted">
                            <span
                              className="size-2.5 shrink-0 rounded-sm"
                              style={{ background: slice.color }}
                            />
                            <span className="truncate">{slice.label}</span>
                          </span>
                          <span className="shrink-0 font-mono tabular-nums text-ink">
                            {formatMoney(slice.value)}
                          </span>
                        </div>
                        <Meter
                          value={totalValue > 0 ? (slice.value / totalValue) * 100 : 0}
                          className="mt-1.5"
                          label={slice.label}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <EmptyState
                  icon={<Sparkles className="size-5" />}
                  title="Nothing allocated"
                  description="Choose a mandate to put your cash to work."
                  action={
                    <ButtonLink href="/dashboard/investments" size="sm">
                      Browse mandates
                    </ButtonLink>
                  }
                />
              )}
            </div>
          </Panel>
        </div>

        {/* ------------------------------------------ positions table --- */}
        <Panel>
          <PanelHeader
            title="Open positions"
            action={
              <Link
                href="/dashboard/investments"
                className="text-[13px] text-brand-bright hover:text-mint"
              >
                Manage →
              </Link>
            }
          />
          {summary.investments.length === 0 ? (
            <EmptyState
              title="No open positions"
              description="Allocate cash to a mandate and it appears here with its live value and P&L."
              action={
                <ButtonLink href="/dashboard/investments" size="sm">
                  Choose a mandate
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {summary.investments.map((investment) => {
                const principal = toNumber(investment.principal);
                const value = toNumber(investment.currentValue);
                const pnl = value - principal;
                const pnlPct = principal > 0 ? (pnl / principal) * 100 : 0;

                return (
                  <li
                    key={investment.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="font-medium text-ink">
                          {investment.plan.name}
                        </span>
                        <StatusPill status={investment.status} />
                      </div>
                      <p className="mt-1 font-mono text-[11.5px] text-ink-faint">
                        {investment.reference} · opened{" "}
                        {formatDate(investment.startedAt)}
                        {investment.maturesAt &&
                          ` · unlocks ${formatDate(investment.maturesAt)}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                          Principal
                        </p>
                        <p className="font-mono text-[14px] tabular-nums text-ink-muted">
                          {formatMoney(principal)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                          Value
                        </p>
                        <p className="font-mono text-[15px] font-semibold tabular-nums text-ink">
                          {formatMoney(value)}
                        </p>
                      </div>
                      <div className="w-24 text-right">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                          P&amp;L
                        </p>
                        <Delta value={pnlPct} className="justify-end" />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* --------------------------------- activity + notifications --- */}
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Panel>
            <PanelHeader
              title="Recent activity"
              action={
                <Link
                  href="/dashboard/transactions"
                  className="text-[13px] text-brand-bright hover:text-mint"
                >
                  All transactions →
                </Link>
              }
            />
            {transactions.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Deposits, allocations, returns and fees all show up here."
              />
            ) : (
              <ul className="divide-y divide-line">
                {transactions.map((transaction) => {
                  const amount = toNumber(transaction.amount);
                  return (
                    <li
                      key={transaction.id}
                      className="flex items-center justify-between gap-4 px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[14px] text-ink">
                          {transaction.description}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                          {transaction.reference} ·{" "}
                          {formatRelativeTime(transaction.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {transaction.status !== "COMPLETED" && (
                          <StatusPill status={transaction.status} />
                        )}
                        <span
                          className={`font-mono text-[14px] font-medium tabular-nums ${
                            amount >= 0 ? "text-mint" : "text-ink"
                          }`}
                        >
                          {amount >= 0 ? "+" : "−"}
                          {formatMoney(Math.abs(amount))}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel id="notifications">
            <PanelHeader title="Notifications" />
            {notifications.length === 0 ? (
              <EmptyState
                icon={<Bell className="size-5" />}
                title="Nothing new"
                description="Account events show up here."
              />
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((notification) => (
                  <li key={notification.id} className="px-5 py-3.5">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                          notification.readAt
                            ? "bg-line-bright"
                            : notification.type === "SUCCESS"
                              ? "bg-mint"
                              : notification.type === "WARNING"
                                ? "bg-gold"
                                : notification.type === "CRITICAL"
                                  ? "bg-loss"
                                  : "bg-brand"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-ink">
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
                          {notification.body}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-faint">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {user.kycStatus === "APPROVED" && summary.openPositions === 0 && (
          <Panel glow className="flex flex-col items-start justify-between gap-5 p-6 md:flex-row md:items-center">
            <div className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-mint/35 bg-mint/10 text-mint">
                <BadgeCheck className="size-5" />
              </span>
              <div>
                <p className="font-display text-[16px] font-semibold text-ink">
                  You are verified and ready to invest
                </p>
                <p className="mt-1 text-[13.5px] text-ink-muted">
                  Eight mandates are available, from dollar income to concentrated
                  growth.
                </p>
              </div>
            </div>
            <ButtonLink href="/dashboard/investments" className="shrink-0">
              Choose a mandate
              <ArrowRight className="size-4" />
            </ButtonLink>
          </Panel>
        )}
      </div>
    </>
  );
}

/**
 * Reconstructs the portfolio value at 12 points over the last 90 days by
 * starting from today's value and unwinding each transaction backwards. The
 * result is exact at every point a transaction occurred; between points it is a
 * straight line, which is honest for a series sampled this coarsely.
 */
async function buildValueHistory(userId: string, currentValue: number) {
  const since = new Date(Date.now() - 90 * 86_400_000);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      status: "COMPLETED",
      createdAt: { gte: since },
      // Allocations move value between two of the investor's own accounts, so
      // they must not count as a change in total portfolio value.
      type: { in: ["DEPOSIT", "WITHDRAWAL", "RETURN", "FEE", "ADJUSTMENT", "REFERRAL_BONUS"] },
    },
    orderBy: { createdAt: "desc" },
    select: { amount: true, createdAt: true },
  });

  if (transactions.length === 0) {
    return { values: [] as number[], labels: [] as string[] };
  }

  const points = 12;
  const step = (Date.now() - since.getTime()) / (points - 1);

  const values: number[] = [];
  const labels: string[] = [];

  for (let i = points - 1; i >= 0; i -= 1) {
    const at = new Date(since.getTime() + step * i);

    // Undo every transaction that happened after this point in time.
    const undo = transactions
      .filter((t) => t.createdAt > at)
      .reduce((sum, t) => sum + toNumber(t.amount), 0);

    values.unshift(Math.max(0, currentValue - undo));
    labels.unshift(
      i % 3 === 0
        ? at.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "",
    );
  }

  return { values, labels };
}
