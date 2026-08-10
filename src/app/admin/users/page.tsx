import Link from "next/link";
import { Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
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

const FILTERS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "kyc-pending", label: "KYC pending" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  await requireAdmin();
  const { q, filter, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { referralCode: { contains: q.toUpperCase() } },
          ],
        }
      : {}),
    ...(filter === "kyc-pending"
      ? { kycStatus: "PENDING" }
      : filter === "ACTIVE" || filter === "PENDING" || filter === "SUSPENDED"
        ? { status: filter }
        : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        country: true,
        role: true,
        status: true,
        kycStatus: true,
        createdAt: true,
        lastLoginAt: true,
        ledgerAccounts: { select: { code: true, balance: true } },
        _count: { select: { investments: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Investors"
        description={`${total} account${total === 1 ? "" : "s"} matching the current filter.`}
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form action="/admin/users" className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Name, email or referral code"
              className="h-10 w-full rounded-xl border border-line-bright bg-surface-2/70 pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-faint focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            {filter && <input type="hidden" name="filter" value={filter} />}
          </form>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              if (item.value) params.set("filter", item.value);
              const href = `/admin/users${params.toString() ? `?${params}` : ""}`;

              return (
                <Link
                  key={item.value || "all"}
                  href={href}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                    (filter ?? "") === item.value
                      ? "border-mint/50 bg-mint/12 text-mint"
                      : "border-line-bright text-ink-muted hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <Panel>
          <PanelHeader title="Accounts" />
          {users.length === 0 ? (
            <EmptyState
              title="No accounts match"
              description="Try a different search or filter."
            />
          ) : (
            <Table className="min-w-[920px]">
              <thead>
                <tr>
                  <Th>Investor</Th>
                  <Th align="center">Status</Th>
                  <Th align="center">KYC</Th>
                  <Th align="right">Cash</Th>
                  <Th align="right">Allocated</Th>
                  <Th align="center">Positions</Th>
                  <Th align="right">Joined</Th>
                  <Th align="right">Last seen</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const cash = toNumber(
                    user.ledgerAccounts.find((a) => a.code.startsWith("user:cash:"))?.balance ?? 0,
                  );
                  const invested = toNumber(
                    user.ledgerAccounts.find((a) => a.code.startsWith("user:invested:"))?.balance ?? 0,
                  );

                  return (
                    <tr key={user.id} className="transition-colors hover:bg-surface-2/60">
                      <Td>
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="block font-medium text-ink hover:text-brand-bright"
                        >
                          {user.firstName} {user.lastName}
                          {user.role !== "USER" && (
                            <span className="ml-2 rounded-md bg-mint/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mint">
                              {user.role.replace("_", " ")}
                            </span>
                          )}
                        </Link>
                        <span className="mt-0.5 block text-[12px] text-ink-faint">
                          {user.email}
                          {user.country && ` · ${user.country}`}
                        </span>
                      </Td>
                      <Td align="center"><StatusPill status={user.status} /></Td>
                      <Td align="center"><StatusPill status={user.kycStatus} /></Td>
                      <Td align="right" mono>{formatMoney(cash)}</Td>
                      <Td align="right" mono>{formatMoney(invested)}</Td>
                      <Td align="center" mono className="text-ink-muted">
                        {user._count.investments}
                      </Td>
                      <Td align="right" className="text-ink-muted">
                        {formatDate(user.createdAt)}
                      </Td>
                      <Td align="right" className="text-ink-muted">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : "never"}
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
                {page > 1 && (
                  <Link
                    href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(filter ? { filter } : {}), page: String(page - 1) })}`}
                    className="rounded-lg border border-line-bright px-3 py-1.5 text-[13px] text-ink hover:border-brand/60"
                  >
                    Previous
                  </Link>
                )}
                {page < pages && (
                  <Link
                    href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(filter ? { filter } : {}), page: String(page + 1) })}`}
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
