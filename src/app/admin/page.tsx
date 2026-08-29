import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  CircleCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { getPlatformTotals, verifyLedgerIntegrity } from "@/lib/ledger";
import { formatMoney, formatRelativeTime } from "@/lib/money";
import { auditLabel } from "@/lib/audit";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import {
  Alert,
  EmptyState,
  Panel,
  PanelHeader,
  Stat,
} from "@/components/ui/primitives";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [
    totals,
    integrity,
    userCounts,
    pendingDeposits,
    pendingWithdrawals,
    pendingKyc,
    recentAudit,
    inflow30d,
  ] = await Promise.all([
    getPlatformTotals(),
    verifyLedgerIntegrity(),
    prisma.user.groupBy({ by: ["status"], where: { role: "USER" }, _count: true }),
    prisma.depositRequest.findMany({
      where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.withdrawalRequest.findMany({
      where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.kycSubmission.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { submittedAt: "asc" },
      take: 5,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        action: true,
        entityType: true,
        actorEmail: true,
        createdAt: true,
      },
    }),
    prisma.depositRequest.aggregate({
      where: {
        status: "APPROVED",
        reviewedAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      },
      _sum: { amount: true },
    }),
  ]);

  const activeUsers =
    userCounts.find((c) => c.status === "ACTIVE")?._count ?? 0;
  const suspended = userCounts.find((c) => c.status === "SUSPENDED")?._count ?? 0;
  const totalUsers = userCounts.reduce((sum, c) => sum + c._count, 0);

  const queueTotal =
    pendingDeposits.length + pendingWithdrawals.length + pendingKyc.length;

  return (
    <>
      <PageHeader
        title="Operations overview"
        description={
          queueTotal > 0
            ? `${queueTotal} item${queueTotal === 1 ? "" : "s"} waiting on a decision.`
            : "Nothing waiting on a decision right now."
        }
      />

      <div className="space-y-6">
        {/* ---------------------------------------------- integrity --- */}
        {integrity.balanced ? (
          <Alert tone="mint">
            <div className="flex items-center gap-2.5">
              <CircleCheck className="size-4 shrink-0" />
              <span>
                Ledger reconciles. {integrity.entryCount} entries and{" "}
                {integrity.lineCount} lines across {integrity.accountCount}{" "}
                accounts, all cached balances match the journal.
              </span>
            </div>
          </Alert>
        ) : (
          <Alert tone="loss" title="Ledger does not reconcile">
            <div className="flex gap-2.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p>
                  Signed sum is {integrity.signedSum} and should be zero.{" "}
                  {integrity.discrepancies.length} account
                  {integrity.discrepancies.length === 1 ? "" : "s"} drifted from
                  the journal.
                </p>
                <Link href="/admin/ledger" className="mt-1 inline-block font-medium underline">
                  Investigate in the ledger →
                </Link>
              </div>
            </div>
          </Alert>
        )}

        {/* -------------------------------------------------- stats --- */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Assets under management"
            value={formatMoney(totals.aum, "USD", { compact: true })}
            sub="owed to investors"
            tone="brand"
          />
          <Stat
            label="Net revenue"
            value={formatMoney(totals.netRevenue, "USD", { compact: true })}
            sub="fees less promotions"
            tone="mint"
          />
          <Stat
            label="Inflow, 30 days"
            value={formatMoney(inflow30d._sum.amount ?? 0, "USD", { compact: true })}
            sub="approved deposits"
          />
          <Stat
            label="Investors"
            value={totalUsers}
            sub={`${activeUsers} active${suspended > 0 ? `, ${suspended} suspended` : ""}`}
          />
        </div>

        {/* -------------------------------------------------- queues --- */}
        <div className="grid gap-6 lg:grid-cols-3">
          <QueuePanel
            title="Deposits"
            icon={<ArrowDownToLine className="size-4" />}
            href="/admin/deposits"
            items={pendingDeposits.map((d) => ({
              id: d.id,
              primary: `${d.user.firstName} ${d.user.lastName}`,
              secondary: `${formatMoney(d.amount)} · ${d.method.replace(/_/g, " ").toLowerCase()}`,
              status: d.status,
              at: d.createdAt,
            }))}
          />
          <QueuePanel
            title="Withdrawals"
            icon={<ArrowUpFromLine className="size-4" />}
            href="/admin/withdrawals"
            items={pendingWithdrawals.map((w) => ({
              id: w.id,
              primary: `${w.user.firstName} ${w.user.lastName}`,
              secondary: `${formatMoney(w.amount)} · net ${formatMoney(w.netAmount)}`,
              status: w.status,
              at: w.createdAt,
            }))}
          />
          <QueuePanel
            title="Verification"
            icon={<BadgeCheck className="size-4" />}
            href="/admin/kyc"
            items={pendingKyc.map((k) => ({
              id: k.id,
              primary: `${k.user.firstName} ${k.user.lastName}`,
              secondary: `${k.documentType.replace(/_/g, " ").toLowerCase()} · ${k.country}`,
              status: k.status,
              at: k.submittedAt,
            }))}
          />
        </div>

        {/* --------------------------------------------------- audit --- */}
        <Panel>
          <PanelHeader
            title="Recent administrative activity"
            action={
              <Link href="/admin/audit" className="text-[13px] text-brand-bright hover:text-mint">
                Full audit log →
              </Link>
            }
          />
          {recentAudit.length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" />}
              title="Nothing logged yet"
              description="Every administrative action is recorded here with who did it and when."
            />
          ) : (
            <ul className="divide-y divide-line">
              {recentAudit.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] text-ink">{auditLabel(entry.action)}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                      {entry.entityType} · {entry.actorEmail ?? "system"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] text-ink-faint">
                    {formatRelativeTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function QueuePanel({
  title,
  icon,
  href,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  items: {
    id: string;
    primary: string;
    secondary: string;
    status: string;
    at: Date;
  }[];
}) {
  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <span className="text-ink-faint">{icon}</span>
            {title}
            {items.length > 0 && (
              <span className="rounded-full bg-gold/20 px-1.5 text-[10.5px] font-semibold text-gold">
                {items.length}
              </span>
            )}
          </span>
        }
        action={
          <Link href={href} className="text-[13px] text-brand-bright hover:text-mint">
            Open →
          </Link>
        }
      />
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-ink-faint">
          Queue is clear.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">
                    {item.primary}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11.5px] capitalize text-ink-muted">
                    {item.secondary}
                  </p>
                </div>
                <StatusPill status={item.status} className="shrink-0" />
              </div>
              <p className="mt-1 text-[11px] text-ink-faint">
                {formatRelativeTime(item.at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
