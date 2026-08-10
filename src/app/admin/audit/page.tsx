import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/money";
import { auditLabel, AUDIT_LABELS } from "@/lib/audit";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Badge,
  EmptyState,
  Panel,
  PanelHeader,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 40;

/** Groups the known actions into filter chips without hard-coding a second list. */
const GROUPS = [
  { value: "", label: "All" },
  { value: "auth.", label: "Sign-in" },
  { value: "deposit.", label: "Deposits" },
  { value: "withdrawal.", label: "Withdrawals" },
  { value: "kyc.", label: "Verification" },
  { value: "investment.", label: "Positions" },
  { value: "ledger.", label: "Ledger" },
  { value: "user.", label: "Accounts" },
  { value: "plan.", label: "Mandates" },
];

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; q?: string; page?: string }>;
}) {
  await requireAdmin();
  const { group, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(group ? { action: { startsWith: group } } : {}),
    ...(q
      ? {
          OR: [
            { actorEmail: { contains: q, mode: "insensitive" } },
            { entityId: { contains: q } },
            { action: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Append-only record of every administrative action: who, what, when, from where, and what the record looked like before and after."
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form action="/admin/audit" className="w-full sm:max-w-xs">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Actor email, action or entity id"
              className="h-10 w-full rounded-xl border border-line-bright bg-surface-2/70 px-3.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            {group && <input type="hidden" name="group" value={group} />}
          </form>

          <div className="flex flex-wrap gap-2">
            {GROUPS.map((item) => {
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              if (item.value) params.set("group", item.value);

              return (
                <Link
                  key={item.value || "all"}
                  href={`/admin/audit${params.toString() ? `?${params}` : ""}`}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                    (group ?? "") === item.value
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
          <PanelHeader
            title={`${total} logged action${total === 1 ? "" : "s"}`}
            description="Sensitive fields — passwords, tokens, document numbers — are redacted before the entry is written."
          />

          {entries.length === 0 ? (
            <EmptyState
              title="Nothing logged"
              description="No entries match this filter."
            />
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((entry) => (
                <li key={entry.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[14px] font-medium text-ink">
                          {auditLabel(entry.action)}
                        </span>
                        {!AUDIT_LABELS[entry.action] && (
                          <Badge tone="outline">{entry.action}</Badge>
                        )}
                        <Badge tone="outline">{entry.entityType}</Badge>
                      </div>
                      <p className="mt-1 font-mono text-[11.5px] text-ink-faint">
                        {entry.actorEmail ?? "system"}
                        {entry.entityId && ` · ${entry.entityId}`}
                        {entry.ip && ` · ${entry.ip}`}
                      </p>
                    </div>
                    <time
                      dateTime={entry.createdAt.toISOString()}
                      className="shrink-0 font-mono text-[12px] text-ink-muted"
                    >
                      {formatDate(entry.createdAt, "datetime")}
                    </time>
                  </div>

                  {(entry.before || entry.after) && (
                    <details className="mt-2.5 group">
                      <summary className="cursor-pointer list-none text-[12px] text-ink-faint transition-colors hover:text-brand-bright">
                        Show before / after
                      </summary>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {entry.before !== null && (
                          <pre className="overflow-x-auto rounded-lg border border-line bg-abyss p-3 font-mono text-[11px] leading-relaxed text-ink-muted">
                            <span className="mb-1 block text-loss">before</span>
                            {JSON.stringify(entry.before, null, 2)}
                          </pre>
                        )}
                        {entry.after !== null && (
                          <pre className="overflow-x-auto rounded-lg border border-line bg-abyss p-3 font-mono text-[11px] leading-relaxed text-ink-muted">
                            <span className="mb-1 block text-mint">after</span>
                            {JSON.stringify(entry.after, null, 2)}
                          </pre>
                        )}
                      </div>
                    </details>
                  )}
                </li>
              ))}
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
                    href={`/admin/audit?${new URLSearchParams({ ...(q ? { q } : {}), ...(group ? { group } : {}), page: String(page - 1) })}`}
                    className="rounded-lg border border-line-bright px-3 py-1.5 text-[13px] text-ink hover:border-brand/60"
                  >
                    Previous
                  </Link>
                )}
                {page < pages && (
                  <Link
                    href={`/admin/audit?${new URLSearchParams({ ...(q ? { q } : {}), ...(group ? { group } : {}), page: String(page + 1) })}`}
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
