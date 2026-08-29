import Link from "next/link";
import { Download } from "lucide-react";
import type { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { toNumber, formatMoney, formatDate } from "@/lib/money";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import {
  EmptyState,
  Panel,
  PanelHeader,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "DEPOSIT", label: "Deposits" },
  { value: "WITHDRAWAL", label: "Withdrawals" },
  { value: "INVESTMENT", label: "Allocations" },
  { value: "RETURN", label: "Returns" },
  { value: "FEE", label: "Fees" },
  { value: "ADJUSTMENT", label: "Adjustments" },
];

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { type, page: pageParam } = await searchParams;

  const page = Math.max(1, Number(pageParam) || 1);
  const where = {
    userId: user.id,
    ...(type && TYPE_FILTERS.some((f) => f.value === type)
      ? { type: type as TransactionType }
      : {}),
  };

  const [transactions, total, totals] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        journalEntry: {
          select: {
            reference: true,
            type: true,
            lines: {
              select: {
                direction: true,
                amount: true,
                account: { select: { name: true, code: true } },
              },
            },
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId: user.id, status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const summary = Object.fromEntries(
    totals.map((row) => [row.type, toNumber(row._sum.amount ?? 0)]),
  ) as Record<string, number>;

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every movement on your account, with the journal entry that produced it."
        action={
          <a
            href="/api/export/transactions"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-line-bright px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-brand/60 hover:bg-brand/8"
          >
            <Download className="size-4" />
            Export CSV
          </a>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Deposited", value: summary.DEPOSIT ?? 0, tone: "text-ink" },
            { label: "Withdrawn", value: Math.abs(summary.WITHDRAWAL ?? 0), tone: "text-ink" },
            { label: "Returns", value: summary.RETURN ?? 0, tone: (summary.RETURN ?? 0) >= 0 ? "text-mint" : "text-loss" },
            { label: "Fees paid", value: Math.abs(summary.FEE ?? 0), tone: "text-ink-muted" },
          ].map((item) => (
            <div key={item.label} className="panel px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                {item.label}
              </p>
              <p className={cn("mt-2 font-mono text-2xl font-semibold tabular-nums", item.tone)}>
                {formatMoney(item.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((filter) => (
            <Link
              key={filter.value || "all"}
              href={filter.value ? `/dashboard/transactions?type=${filter.value}` : "/dashboard/transactions"}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                (type ?? "") === filter.value
                  ? "border-brand/50 bg-brand/12 text-brand-bright"
                  : "border-line-bright text-ink-muted hover:text-ink",
              )}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <Panel>
          <PanelHeader
            title={`${total} transaction${total === 1 ? "" : "s"}`}
            description="Expand a row's journal reference to see both sides of the entry."
          />

          {transactions.length === 0 ? (
            <EmptyState
              title="Nothing to show"
              description="Transactions appear here as soon as money moves."
            />
          ) : (
            <Table className="min-w-[780px]">
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th>Reference</Th>
                  <Th align="center">Status</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Balance after</Th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const amount = toNumber(transaction.amount);
                  return (
                    <tr key={transaction.id} className="align-top">
                      <Td className="whitespace-nowrap text-ink-muted">
                        {formatDate(transaction.createdAt, "datetime")}
                      </Td>
                      <Td>
                        <span className="block text-ink">{transaction.description}</span>
                        {transaction.journalEntry && (
                          <details className="mt-1.5 group">
                            <summary className="cursor-pointer list-none font-mono text-[11px] text-ink-faint transition-colors hover:text-brand-bright">
                              {transaction.journalEntry.reference} · show journal
                            </summary>
                            <ul className="mt-2 space-y-1 rounded-lg border border-line bg-surface-2/60 p-2.5">
                              {transaction.journalEntry.lines.map((line, index) => (
                                <li
                                  key={index}
                                  className="flex items-center justify-between gap-4 font-mono text-[11.5px]"
                                >
                                  <span className="text-ink-muted">
                                    <span
                                      className={
                                        line.direction === "DEBIT"
                                          ? "text-brand-bright"
                                          : "text-mint"
                                      }
                                    >
                                      {line.direction === "DEBIT" ? "Dr" : "Cr"}
                                    </span>{" "}
                                    {line.account.name}
                                  </span>
                                  <span className="tabular-nums text-ink">
                                    {formatMoney(line.amount)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </Td>
                      <Td mono className="whitespace-nowrap text-ink-faint">
                        {transaction.reference}
                      </Td>
                      <Td align="center">
                        <StatusPill status={transaction.status} />
                      </Td>
                      <Td
                        align="right"
                        mono
                        className={amount >= 0 ? "text-mint" : "text-ink"}
                      >
                        {amount >= 0 ? "+" : "−"}
                        {formatMoney(Math.abs(amount))}
                      </Td>
                      <Td align="right" mono className="text-ink-muted">
                        {transaction.balanceAfter
                          ? formatMoney(transaction.balanceAfter)
                          : "—"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}

          {pages > 1 && (
            <nav
              className="flex items-center justify-between border-t border-line px-5 py-3"
              aria-label="Pagination"
            >
              <span className="text-[13px] text-ink-muted">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <PageLink
                  href={`/dashboard/transactions?${new URLSearchParams({ ...(type ? { type } : {}), page: String(page - 1) })}`}
                  disabled={page <= 1}
                >
                  Previous
                </PageLink>
                <PageLink
                  href={`/dashboard/transactions?${new URLSearchParams({ ...(type ? { type } : {}), page: String(page + 1) })}`}
                  disabled={page >= pages}
                >
                  Next
                </PageLink>
              </div>
            </nav>
          )}
        </Panel>
      </div>
    </>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink-faint opacity-50">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-line-bright px-3 py-1.5 text-[13px] text-ink transition-colors hover:border-brand/60 hover:bg-brand/8"
    >
      {children}
    </Link>
  );
}
