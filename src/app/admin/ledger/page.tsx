import Link from "next/link";
import { CircleCheck } from "lucide-react";
import type { EntryType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/session";
import { getPlatformTotals, verifyLedgerIntegrity } from "@/lib/ledger";
import { toNumber, formatMoney, formatDate } from "@/lib/money";
import { PageHeader } from "@/components/dashboard/page-header";
import { ReverseEntryForm } from "@/components/admin/reverse-entry-form";
import {
  Alert,
  Badge,
  EmptyState,
  Panel,
  PanelHeader,
  Stat,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;

const ENTRY_TYPES: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "DEPOSIT", label: "Deposits" },
  { value: "WITHDRAWAL", label: "Withdrawals" },
  { value: "INVESTMENT_OPEN", label: "Allocations" },
  { value: "INVESTMENT_CLOSE", label: "Closures" },
  { value: "RETURN_ACCRUAL", label: "Returns" },
  { value: "MANUAL_ADJUSTMENT", label: "Adjustments" },
  { value: "REVERSAL", label: "Reversals" },
];

export default async function AdminLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const actor = await requireAdmin();
  const canApprove = hasRole(actor.role, "ADMIN");
  const { type, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.JournalEntryWhereInput =
    type && ENTRY_TYPES.some((t) => t.value === type)
      ? { type: type as EntryType }
      : {};

  const [integrity, totals, accounts, entries, total] = await Promise.all([
    verifyLedgerIntegrity(),
    getPlatformTotals(),
    prisma.ledgerAccount.findMany({
      where: { isSystem: true },
      orderBy: { code: "asc" },
    }),
    prisma.journalEntry.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        lines: { include: { account: { select: { name: true, code: true } } } },
        createdBy: { select: { email: true } },
        reversedBy: { select: { reference: true } },
        reverses: { select: { reference: true } },
      },
    }),
    prisma.journalEntry.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="General ledger"
        description="Append-only. Corrections are posted as reversals that point back at the original entry — nothing here is ever edited or deleted."
      />

      <div className="space-y-6">
        {integrity.balanced ? (
          <Alert tone="mint">
            <div className="flex items-center gap-2.5">
              <CircleCheck className="size-4 shrink-0" />
              <span>
                Verified at {formatDate(integrity.checkedAt, "datetime")}. Every
                cached balance matches the sum of its journal lines, and the book
                sums to zero.
              </span>
            </div>
          </Alert>
        ) : (
          <Alert tone="loss" title="Reconciliation failed">
            <p>Signed sum {integrity.signedSum}, expected 0.</p>
            {integrity.discrepancies.length > 0 && (
              <Table className="mt-3 min-w-[520px]">
                <thead>
                  <tr>
                    <Th>Account</Th>
                    <Th align="right">Cached</Th>
                    <Th align="right">Derived</Th>
                    <Th align="right">Drift</Th>
                  </tr>
                </thead>
                <tbody>
                  {integrity.discrepancies.map((d) => (
                    <tr key={d.code}>
                      <Td mono>{d.code}</Td>
                      <Td align="right" mono>{d.cached}</Td>
                      <Td align="right" mono>{d.derived}</Td>
                      <Td align="right" mono className="text-loss">{d.drift}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Assets" value={formatMoney(totals.assets, "USD", { compact: true })} />
          <Stat
            label="Liabilities (AUM)"
            value={formatMoney(totals.liabilities, "USD", { compact: true })}
            tone="brand"
          />
          <Stat label="Income" value={formatMoney(totals.income, "USD", { compact: true })} tone="mint" />
          <Stat label="Expenses" value={formatMoney(totals.expenses, "USD", { compact: true })} />
        </div>

        <Panel>
          <PanelHeader title="System accounts" description="Chart of accounts, excluding per-investor accounts." />
          <Table>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th align="right">Balance</Th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <Td mono className="text-ink-muted">{account.code}</Td>
                  <Td>{account.name}</Td>
                  <Td>
                    <Badge tone="outline">{account.type.toLowerCase()}</Badge>
                  </Td>
                  <Td align="right" mono>{formatMoney(account.balance)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>

        <div className="flex flex-wrap gap-2">
          {ENTRY_TYPES.map((item) => (
            <Link
              key={item.value || "all"}
              href={item.value ? `/admin/ledger?type=${item.value}` : "/admin/ledger"}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                (type ?? "") === item.value
                  ? "border-mint/50 bg-mint/12 text-mint"
                  : "border-line-bright text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <Panel>
          <PanelHeader
            title={`${total} journal ${total === 1 ? "entry" : "entries"}`}
            description="Every entry balances: total debits equal total credits."
          />
          {entries.length === 0 ? (
            <EmptyState title="No entries" description="Nothing posted for this filter." />
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((entry) => {
                const debits = entry.lines
                  .filter((l) => l.direction === "DEBIT")
                  .reduce((sum, l) => sum + toNumber(l.amount), 0);

                return (
                  <li key={entry.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-[13px] text-ink">
                            {entry.reference}
                          </span>
                          <Badge tone={entry.type === "REVERSAL" ? "violet" : "outline"}>
                            {entry.type.replace(/_/g, " ").toLowerCase()}
                          </Badge>
                          {entry.reversedBy && (
                            <Badge tone="loss">reversed by {entry.reversedBy.reference}</Badge>
                          )}
                          {entry.reverses && (
                            <Badge tone="violet">reverses {entry.reverses.reference}</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-[13.5px] text-ink-muted">
                          {entry.description}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                          {formatDate(entry.occurredAt, "datetime")}
                          {entry.createdBy && ` · ${entry.createdBy.email}`}
                        </p>
                      </div>

                      <span className="font-mono text-lg font-semibold tabular-nums text-ink">
                        {formatMoney(debits)}
                      </span>
                    </div>

                    <ul className="mt-3 space-y-1 rounded-lg border border-line bg-surface-2/50 p-3">
                      {entry.lines.map((line) => (
                        <li
                          key={line.id}
                          className="flex items-center justify-between gap-4 font-mono text-[12px]"
                        >
                          <span className="min-w-0 truncate text-ink-muted">
                            <span
                              className={
                                line.direction === "DEBIT" ? "text-brand-bright" : "text-mint"
                              }
                            >
                              {line.direction === "DEBIT" ? "Dr" : "Cr"}
                            </span>{" "}
                            {line.account.name}
                            {line.memo && (
                              <span className="ml-2 text-ink-faint">— {line.memo}</span>
                            )}
                          </span>
                          <span className="shrink-0 tabular-nums text-ink">
                            {formatMoney(line.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {!entry.reversedBy && entry.type !== "REVERSAL" && (
                      <div className="mt-3">
                        <ReverseEntryForm entryId={entry.id} canApprove={canApprove} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
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
                {page > 1 && (
                  <Link
                    href={`/admin/ledger?${new URLSearchParams({ ...(type ? { type } : {}), page: String(page - 1) })}`}
                    className="rounded-lg border border-line-bright px-3 py-1.5 text-[13px] text-ink hover:border-brand/60"
                  >
                    Previous
                  </Link>
                )}
                {page < pages && (
                  <Link
                    href={`/admin/ledger?${new URLSearchParams({ ...(type ? { type } : {}), page: String(page + 1) })}`}
                    className="rounded-lg border border-line-bright px-3 py-1.5 text-[13px] text-ink hover:border-brand/60"
                  >
                    Next
                  </Link>
                )}
              </div>
            </nav>
          )}
        </Panel>
      </div>
    </>
  );
}
