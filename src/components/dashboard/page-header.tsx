import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Status chip used across dashboard and admin tables. */
export function StatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone: Record<string, string> = {
    // Requests
    PENDING: "border-gold/35 bg-gold/12 text-gold",
    UNDER_REVIEW: "border-brand/35 bg-brand/12 text-brand-bright",
    APPROVED: "border-mint/35 bg-mint/12 text-mint",
    REJECTED: "border-loss/35 bg-loss/12 text-loss",
    CANCELLED: "border-line-bright bg-surface-3 text-ink-faint",
    // Transactions
    COMPLETED: "border-mint/35 bg-mint/12 text-mint",
    FAILED: "border-loss/35 bg-loss/12 text-loss",
    REVERSED: "border-violet/35 bg-violet/12 text-violet",
    // Investments
    ACTIVE: "border-mint/35 bg-mint/12 text-mint",
    MATURED: "border-brand/35 bg-brand/12 text-brand-bright",
    CLOSED: "border-line-bright bg-surface-3 text-ink-faint",
    // Users and KYC
    NOT_STARTED: "border-line-bright bg-surface-3 text-ink-faint",
    EXPIRED: "border-gold/35 bg-gold/12 text-gold",
    SUSPENDED: "border-loss/35 bg-loss/12 text-loss",
  };

  const label = status.replace(/_/g, " ").toLowerCase();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
        tone[status] ?? "border-line-bright bg-surface-3 text-ink-muted",
        className,
      )}
    >
      {label}
    </span>
  );
}
