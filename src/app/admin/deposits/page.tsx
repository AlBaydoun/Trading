import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/session";
import { formatMoney, formatDate, formatRelativeTime } from "@/lib/money";
import { methodLabel } from "@/lib/operations/money";
import { reviewDepositAction } from "@/actions/admin";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import { ReviewForm } from "@/components/admin/review-form";
import {
  EmptyState,
  Panel,
  PanelHeader,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";

export default async function AdminDepositsPage() {
  const actor = await requireAdmin();
  const canApprove = hasRole(actor.role, "ADMIN");

  const [pending, recent] = await Promise.all([
    prisma.depositRequest.findMany({
      where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, kycStatus: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.depositRequest.findMany({
      where: { status: { in: ["APPROVED", "REJECTED", "CANCELLED"] } },
      include: { user: { select: { firstName: true, lastName: true } }, reviewer: { select: { email: true } } },
      orderBy: { reviewedAt: "desc" },
      take: 25,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Deposits"
        description="Match each request against the payment that actually arrived, then approve. Approving posts a balanced journal entry and credits the investor immediately."
      />

      <div className="space-y-6">
        <Panel>
          <PanelHeader
            title={`${pending.length} awaiting review`}
            description="Oldest first. Check the amount and reference against your bank or custody statement before approving."
          />
          {pending.length === 0 ? (
            <EmptyState title="Queue is clear" description="No deposits waiting." />
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((deposit) => (
                <li key={deposit.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                          href={`/admin/users/${deposit.user.id}`}
                          className="font-medium text-ink hover:text-brand-bright"
                        >
                          {deposit.user.firstName} {deposit.user.lastName}
                        </Link>
                        <StatusPill status={deposit.status} />
                        <StatusPill status={deposit.user.kycStatus} />
                      </div>
                      <p className="mt-1 text-[12.5px] text-ink-muted">
                        {deposit.user.email}
                      </p>
                      <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
                        <Row label="Reference" value={deposit.reference} mono />
                        <Row label="Method" value={methodLabel(deposit.method)} />
                        {deposit.senderReference && (
                          <Row label="Their reference" value={deposit.senderReference} />
                        )}
                        {deposit.txHash && (
                          <Row label="Tx hash" value={deposit.txHash} mono truncate />
                        )}
                        <Row label="Requested" value={formatRelativeTime(deposit.createdAt)} />
                        <Row
                          label="Proof"
                          value={deposit.proofPath ? "uploaded" : "none provided"}
                        />
                      </dl>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                        Amount
                      </p>
                      <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
                        {formatMoney(deposit.amount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ReviewForm
                      id={deposit.id}
                      action={reviewDepositAction}
                      approveLabel="Approve & credit"
                      disabled={!canApprove}
                      approveWarning="This credits the investor's cash balance and posts a journal entry. Reversing it later requires a mirror entry — the original cannot be deleted."
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Recently decided" />
          {recent.length === 0 ? (
            <EmptyState title="Nothing decided yet" />
          ) : (
            <Table className="min-w-[820px]">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Investor</Th>
                  <Th>Method</Th>
                  <Th align="right">Amount</Th>
                  <Th align="center">Status</Th>
                  <Th>Reviewed by</Th>
                  <Th align="right">When</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((deposit) => (
                  <tr key={deposit.id}>
                    <Td mono className="text-ink-muted">{deposit.reference}</Td>
                    <Td>{deposit.user.firstName} {deposit.user.lastName}</Td>
                    <Td>{methodLabel(deposit.method)}</Td>
                    <Td align="right" mono>{formatMoney(deposit.amount)}</Td>
                    <Td align="center"><StatusPill status={deposit.status} /></Td>
                    <Td className="text-[12.5px] text-ink-muted">
                      {deposit.reviewer?.email ?? "—"}
                    </Td>
                    <Td align="right" className="text-ink-muted">
                      {formatDate(deposit.reviewedAt)}
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
