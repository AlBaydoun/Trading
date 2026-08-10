import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/session";
import { formatMoney, formatDate, formatRelativeTime, toNumber } from "@/lib/money";
import { methodLabel, getAvailableCash } from "@/lib/operations/money";
import { reviewWithdrawalAction } from "@/actions/admin";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import { ReviewForm } from "@/components/admin/review-form";
import {
  Alert,
  EmptyState,
  Panel,
  PanelHeader,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";

export default async function AdminWithdrawalsPage() {
  const actor = await requireAdmin();
  const canApprove = hasRole(actor.role, "ADMIN");

  const [pending, recent] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            kycStatus: true,
            status: true,
            country: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.withdrawalRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED", "CANCELLED"] } },
      include: {
        user: { select: { firstName: true, lastName: true } },
        reviewer: { select: { email: true } },
      },
      orderBy: { reviewedAt: "desc" },
      take: 25,
    }),
  ]);

  // Show the live balance next to each request — the balance can move between
  // the request and the review, and approving over it must not be possible.
  const balances = await Promise.all(
    pending.map(async (w) => ({
      id: w.id,
      cash: toNumber(
        (
          await prisma.ledgerAccount.findUnique({
            where: { code: `user:cash:${w.userId}` },
            select: { balance: true },
          })
        )?.balance ?? 0,
      ),
      available: toNumber(await getAvailableCash(w.userId)),
    })),
  );
  const balanceById = new Map(balances.map((b) => [b.id, b]));

  return (
    <>
      <PageHeader
        title="Withdrawals"
        description="Verify the destination belongs to the investor before approving. Approving debits their cash, credits the settlement account and books the fee."
      />

      <div className="space-y-6">
        <Panel>
          <PanelHeader
            title={`${pending.length} awaiting review`}
            description="The amount is already held against the investor's available balance."
          />
          {pending.length === 0 ? (
            <EmptyState title="Queue is clear" description="No withdrawals waiting." />
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((withdrawal) => {
                const balance = balanceById.get(withdrawal.id);
                const destination = withdrawal.destination as Record<string, unknown>;
                const shortfall =
                  balance !== undefined &&
                  balance.cash < toNumber(withdrawal.amount);

                return (
                  <li key={withdrawal.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Link
                            href={`/admin/users/${withdrawal.user.id}`}
                            className="font-medium text-ink hover:text-brand-bright"
                          >
                            {withdrawal.user.firstName} {withdrawal.user.lastName}
                          </Link>
                          <StatusPill status={withdrawal.status} />
                          <StatusPill status={withdrawal.user.kycStatus} />
                          {withdrawal.user.status !== "ACTIVE" && (
                            <StatusPill status={withdrawal.user.status} />
                          )}
                        </div>
                        <p className="mt-1 text-[12.5px] text-ink-muted">
                          {withdrawal.user.email}
                          {withdrawal.user.country && ` · ${withdrawal.user.country}`}
                        </p>

                        <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
                          <Row label="Reference" value={withdrawal.reference} mono />
                          <Row label="Method" value={methodLabel(withdrawal.method)} />
                          <Row
                            label="Destination"
                            value={String(destination.destination ?? "—")}
                            mono
                            truncate
                          />
                          {destination.accountName != null && (
                            <Row label="Account name" value={String(destination.accountName)} />
                          )}
                          <Row label="Requested" value={formatRelativeTime(withdrawal.createdAt)} />
                          <Row
                            label="Cash balance"
                            value={`${formatMoney(balance?.cash ?? 0)} (available ${formatMoney(balance?.available ?? 0)})`}
                            mono
                          />
                          {destination.note != null && (
                            <Row label="Note" value={String(destination.note)} />
                          )}
                        </dl>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                          Gross
                        </p>
                        <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
                          {formatMoney(withdrawal.amount)}
                        </p>
                        <p className="mt-1 font-mono text-[12px] tabular-nums text-ink-muted">
                          fee {formatMoney(withdrawal.feeAmount)} · net{" "}
                          <span className="text-mint">
                            {formatMoney(withdrawal.netAmount)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {shortfall && (
                      <Alert tone="loss" className="mt-4">
                        The investor&apos;s cash balance no longer covers this
                        withdrawal. Approving will be rejected by the ledger —
                        decline it or ask them to close a position first.
                      </Alert>
                    )}

                    {withdrawal.user.kycStatus !== "APPROVED" && (
                      <Alert tone="gold" className="mt-4">
                        This investor is not KYC-approved. Do not release funds
                        until verification is complete.
                      </Alert>
                    )}

                    <div className="mt-4">
                      <ReviewForm
                        id={withdrawal.id}
                        action={reviewWithdrawalAction}
                        approveLabel="Approve payout"
                        disabled={!canApprove}
                        approveWarning="Confirm the destination matches the investor's verified identity. Once funds leave the client account they cannot be recalled."
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Recently decided" />
          {recent.length === 0 ? (
            <EmptyState title="Nothing decided yet" />
          ) : (
            <Table className="min-w-[880px]">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Investor</Th>
                  <Th>Method</Th>
                  <Th align="right">Gross</Th>
                  <Th align="right">Fee</Th>
                  <Th align="right">Net</Th>
                  <Th align="center">Status</Th>
                  <Th align="right">When</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((withdrawal) => (
                  <tr key={withdrawal.id}>
                    <Td mono className="text-ink-muted">{withdrawal.reference}</Td>
                    <Td>
                      {withdrawal.user.firstName} {withdrawal.user.lastName}
                    </Td>
                    <Td>{methodLabel(withdrawal.method)}</Td>
                    <Td align="right" mono>{formatMoney(withdrawal.amount)}</Td>
                    <Td align="right" mono className="text-ink-muted">
                      {formatMoney(withdrawal.feeAmount)}
                    </Td>
                    <Td align="right" mono>{formatMoney(withdrawal.netAmount)}</Td>
                    <Td align="center"><StatusPill status={withdrawal.status} /></Td>
                    <Td align="right" className="text-ink-muted">
                      {formatDate(withdrawal.reviewedAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono = false,
  truncate = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-faint">{label}</dt>
      <dd
        className={`min-w-0 text-ink-muted ${mono ? "font-mono" : ""} ${truncate ? "truncate" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
