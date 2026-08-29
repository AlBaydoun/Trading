import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/session";
import { getAvailableCash } from "@/lib/operations/money";
import { toNumber, formatMoney, formatDate, formatRelativeTime } from "@/lib/money";
import { auditLabel } from "@/lib/audit";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import {
  AdjustBalanceForm,
  UserStatusForm,
} from "@/components/admin/user-controls";
import {
  EmptyState,
  Panel,
  PanelHeader,
  Stat,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdmin();
  const { id } = await params;

  const canApprove = hasRole(actor.role, "ADMIN");
  const canChangeRole = hasRole(actor.role, "SUPER_ADMIN");

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      ledgerAccounts: { select: { code: true, balance: true, name: true } },
      investments: {
        include: { plan: { select: { name: true, slug: true } } },
        orderBy: { startedAt: "desc" },
      },
      kycSubmissions: { orderBy: { submittedAt: "desc" }, take: 1 },
      referredBy: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { referrals: true, transactions: true } },
    },
  });

  if (!user) notFound();

  const [available, transactions, deposits, withdrawals, audit] = await Promise.all([
    getAvailableCash(user.id),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.depositRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.withdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.auditLog.findMany({
      where: { OR: [{ actorId: user.id }, { entityId: user.id }] },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const cash = toNumber(
    user.ledgerAccounts.find((a) => a.code.startsWith("user:cash:"))?.balance ?? 0,
  );
  const invested = toNumber(
    user.ledgerAccounts.find((a) => a.code.startsWith("user:invested:"))?.balance ?? 0,
  );
  const kyc = user.kycSubmissions[0];

  return (
    <>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-2 text-[13px] text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All investors
      </Link>

      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{user.email}</span>
            <StatusPill status={user.status} />
            <StatusPill status={user.kycStatus} />
            {user.role !== "USER" && (
              <span className="rounded-md bg-mint/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mint">
                {user.role.replace("_", " ")}
              </span>
            )}
          </span>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Cash balance" value={formatMoney(cash)} sub={`${formatMoney(available)} available`} />
          <Stat label="Allocated" value={formatMoney(invested)} tone="brand" />
          <Stat label="Total value" value={formatMoney(cash + invested)} tone="mint" />
          <Stat
            label="Transactions"
            value={user._count.transactions}
            sub={`${user._count.referrals} referral${user._count.referrals === 1 ? "" : "s"}`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Account detail" />
            <dl className="divide-y divide-line">
              {[
                ["User ID", user.id],
                ["Country", user.country ?? "—"],
                ["Phone", user.phone ?? "—"],
                ["Risk profile", user.riskProfile.toLowerCase()],
                ["Referral code", user.referralCode],
                [
                  "Referred by",
                  user.referredBy
                    ? `${user.referredBy.firstName} ${user.referredBy.lastName}`
                    : "—",
                ],
                ["Registered", formatDate(user.createdAt, "long")],
                ["Last sign-in", user.lastLoginAt ? formatDate(user.lastLoginAt, "datetime") : "never"],
                ["Last IP", user.lastLoginIp ?? "—"],
                ["Failed logins", String(user.failedLogins)],
                ["Marketing opt-in", user.marketingOptIn ? "yes" : "no"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-5 py-2.5">
                  <dt className="text-[13px] text-ink-muted">{label}</dt>
                  <dd className="truncate font-mono text-[12.5px] capitalize text-ink">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title="Verification" />
            {kyc ? (
              <dl className="divide-y divide-line">
                {[
                  ["Status", kyc.status.toLowerCase()],
                  ["Document", kyc.documentType.replace(/_/g, " ").toLowerCase()],
                  ["Nationality", kyc.nationality],
                  ["Date of birth", formatDate(kyc.dateOfBirth)],
                  ["Address", `${kyc.addressLine1}, ${kyc.city} ${kyc.postalCode}, ${kyc.country}`],
                  ["Source of funds", kyc.sourceOfFunds.replace(/_/g, " ").toLowerCase()],
                  ["PEP", kyc.isPep ? "yes" : "no"],
                  ["Submitted", formatDate(kyc.submittedAt, "long")],
                  ["Reviewed", kyc.reviewedAt ? formatDate(kyc.reviewedAt, "long") : "—"],
                  ["Expires", kyc.expiresAt ? formatDate(kyc.expiresAt, "long") : "—"],
                  ["Notes", kyc.reviewNotes ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 px-5 py-2.5">
                    <dt className="shrink-0 text-[13px] text-ink-muted">{label}</dt>
                    <dd className="text-right text-[12.5px] capitalize text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <EmptyState
                title="No submission"
                description="This investor has not started identity verification."
              />
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <UserStatusForm
            userId={user.id}
            status={user.status}
            role={user.role}
            notes={user.notes ?? ""}
            canApprove={canApprove}
            canChangeRole={canChangeRole}
          />
          <AdjustBalanceForm userId={user.id} canApprove={canApprove} />
        </div>

        <Panel>
          <PanelHeader title="Positions" />
          {user.investments.length === 0 ? (
            <EmptyState title="No positions" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Mandate</Th>
                  <Th>Reference</Th>
                  <Th align="right">Principal</Th>
                  <Th align="right">Value</Th>
                  <Th align="right">P&amp;L</Th>
                  <Th align="center">Status</Th>
                  <Th align="right">Opened</Th>
                </tr>
              </thead>
              <tbody>
                {user.investments.map((investment) => {
                  const pnl = toNumber(investment.currentValue) - toNumber(investment.principal);
                  return (
                    <tr key={investment.id}>
                      <Td>{investment.plan.name}</Td>
                      <Td mono className="text-ink-faint">{investment.reference}</Td>
                      <Td align="right" mono>{formatMoney(investment.principal)}</Td>
                      <Td align="right" mono>{formatMoney(investment.currentValue)}</Td>
                      <Td align="right" mono className={pnl >= 0 ? "text-mint" : "text-loss"}>
                        {pnl >= 0 ? "+" : "−"}
                        {formatMoney(Math.abs(pnl))}
                      </Td>
                      <Td align="center"><StatusPill status={investment.status} /></Td>
                      <Td align="right" className="text-ink-muted">
                        {formatDate(investment.startedAt)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Deposits" />
            {deposits.length === 0 ? (
              <EmptyState title="None" />
            ) : (
              <ul className="divide-y divide-line">
                {deposits.map((deposit) => (
                  <li key={deposit.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[12.5px] text-ink">{deposit.reference}</p>
                      <p className="text-[11.5px] text-ink-faint">
                        {formatDate(deposit.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill status={deposit.status} />
                      <span className="font-mono text-[13px] tabular-nums text-ink">
                        {formatMoney(deposit.amount)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Withdrawals" />
            {withdrawals.length === 0 ? (
              <EmptyState title="None" />
            ) : (
              <ul className="divide-y divide-line">
                {withdrawals.map((withdrawal) => (
                  <li key={withdrawal.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[12.5px] text-ink">{withdrawal.reference}</p>
                      <p className="text-[11.5px] text-ink-faint">
                        {formatDate(withdrawal.createdAt)} · net{" "}
                        {formatMoney(withdrawal.netAmount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill status={withdrawal.status} />
                      <span className="font-mono text-[13px] tabular-nums text-ink">
                        {formatMoney(withdrawal.amount)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Recent transactions" />
            <ul className="divide-y divide-line">
              {transactions.map((transaction) => {
                const amount = toNumber(transaction.amount);
                return (
                  <li key={transaction.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-ink">{transaction.description}</p>
                      <p className="font-mono text-[11px] text-ink-faint">
                        {transaction.reference} · {formatRelativeTime(transaction.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-mono text-[13px] tabular-nums ${amount >= 0 ? "text-mint" : "text-ink"}`}
                    >
                      {amount >= 0 ? "+" : "−"}
                      {formatMoney(Math.abs(amount))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Audit trail" description="Actions by and against this account." />
            <ul className="divide-y divide-line">
              {audit.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <p className="text-[13px] text-ink">{auditLabel(entry.action)}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                    {entry.actorEmail ?? "system"} · {formatDate(entry.createdAt, "datetime")}
                    {entry.ip && ` · ${entry.ip}`}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
