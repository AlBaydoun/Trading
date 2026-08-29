import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, transactionBlockReason } from "@/lib/auth/guards";
import { getAvailableCash } from "@/lib/operations/money";
import { methodLabel } from "@/lib/operations/money";
import { toNumber, formatMoney, formatDate } from "@/lib/money";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import { WithdrawForm } from "@/components/dashboard/withdraw-form";
import {
  EmptyState,
  Panel,
  PanelHeader,
  Stat,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";

export default async function WithdrawPage() {
  const user = await requireUser();

  const [available, withdrawals, locked] = await Promise.all([
    getAvailableCash(user.id),
    prisma.withdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.investment.aggregate({
      where: { userId: user.id, status: { in: ["ACTIVE", "MATURED"] } },
      _sum: { currentValue: true },
    }),
  ]);

  const blocked = transactionBlockReason(user);
  const lockedValue = toNumber(locked._sum.currentValue ?? 0);

  return (
    <>
      <PageHeader
        title="Withdraw funds"
        description="Cash sitting outside a mandate can be withdrawn at any time. Capital inside an open position must be released first."
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Available to withdraw" value={formatMoney(available)} tone="mint" />
          <Stat
            label="In open positions"
            value={formatMoney(lockedValue)}
            sub={
              lockedValue > 0 ? (
                <Link href="/dashboard/investments" className="text-brand-bright hover:text-mint">
                  Close a position →
                </Link>
              ) : (
                "nothing allocated"
              )
            }
          />
          <Stat
            label="Pending requests"
            value={withdrawals.filter((w) => w.status === "PENDING" || w.status === "UNDER_REVIEW").length}
            sub="held against your balance"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <WithdrawForm availableCash={toNumber(available)} blocked={blocked} />

          <div className="panel h-fit p-6">
            <h2 className="font-display text-[16px] font-semibold text-ink">
              How withdrawals work
            </h2>
            <ol className="mt-4 space-y-4">
              {[
                ["Request", "You submit the amount and destination. The amount is held against your balance immediately so it cannot be double-spent."],
                ["Review", "Operations checks the destination against your verified identity. Same business day."],
                ["Settlement", "Funds leave our client account. Bank transfers take 1–3 business days; crypto is usually within hours."],
                ["Ledger", "A balanced journal entry posts on approval: your cash is debited, the settlement account and the fee account are credited."],
              ].map(([title, body], index) => (
                <li key={title} className="flex gap-3.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line-bright font-mono text-[11px] text-ink-faint">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-medium text-ink">{title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <Panel>
          <PanelHeader title="Withdrawal history" />
          {withdrawals.length === 0 ? (
            <EmptyState
              title="No withdrawals yet"
              description="Your requests and their status will appear here."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Method</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Fee</Th>
                  <Th align="right">Net</Th>
                  <Th align="center">Status</Th>
                  <Th align="right">Requested</Th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id}>
                    <Td mono className="text-ink-muted">{withdrawal.reference}</Td>
                    <Td>{methodLabel(withdrawal.method)}</Td>
                    <Td align="right" mono>{formatMoney(withdrawal.amount)}</Td>
                    <Td align="right" mono className="text-loss">
                      {formatMoney(withdrawal.feeAmount)}
                    </Td>
                    <Td align="right" mono className="font-medium">
                      {formatMoney(withdrawal.netAmount)}
                    </Td>
                    <Td align="center">
                      <StatusPill status={withdrawal.status} />
                    </Td>
                    <Td align="right" className="text-ink-muted">
                      {formatDate(withdrawal.createdAt)}
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
