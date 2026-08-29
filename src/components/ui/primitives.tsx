import * as React from "react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Surfaces
   ========================================================================== */

export function Panel({
  className,
  children,
  glow = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return (
    <div
      className={cn(
        "panel relative overflow-hidden",
        glow &&
          "before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-brand/70 before:to-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4 md:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ==========================================================================
   Badges and deltas
   ========================================================================== */

type Tone =
  | "neutral"
  | "brand"
  | "mint"
  | "gold"
  | "loss"
  | "violet"
  | "outline";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-surface-3 text-ink-muted border-line-bright",
  brand: "bg-brand/12 text-brand-bright border-brand/30",
  mint: "bg-mint/12 text-mint border-mint/30",
  gold: "bg-gold/12 text-gold border-gold/30",
  loss: "bg-loss/12 text-loss border-loss/30",
  violet: "bg-violet/14 text-violet border-violet/30",
  outline: "bg-transparent text-ink-muted border-line-bright",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  dot = false,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em]",
        toneStyles[tone],
        className,
      )}
    >
      {dot && (
        <span className="size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
      )}
      {children}
    </span>
  );
}

/**
 * A signed percentage. Green up, red down, muted flat — and an arrow glyph so
 * the direction survives for anyone who cannot distinguish the two colours.
 */
export function Delta({
  value,
  className,
  showArrow = true,
  digits = 2,
  suffix = "%",
}: {
  value: number;
  className?: string;
  showArrow?: boolean;
  digits?: number;
  suffix?: string;
}) {
  const flat = Math.abs(value) < 0.005;
  const up = value > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[13px] font-medium tabular-nums",
        flat ? "text-ink-faint" : up ? "text-mint" : "text-loss",
        className,
      )}
    >
      {showArrow && !flat && (
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
          <path
            d={up ? "M6 2.5 L10 8.5 L2 8.5 Z" : "M6 9.5 L2 3.5 L10 3.5 Z"}
            fill="currentColor"
          />
        </svg>
      )}
      {flat ? "" : up ? "+" : "−"}
      {Math.abs(value).toFixed(digits)}
      {suffix}
      <span className="sr-only">
        {flat ? "unchanged" : up ? "increase" : "decrease"}
      </span>
    </span>
  );
}

/* ==========================================================================
   Stats
   ========================================================================== */

export function Stat({
  label,
  value,
  sub,
  delta,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  delta?: number;
  tone?: "neutral" | "brand" | "mint" | "loss";
  className?: string;
}) {
  const accent = {
    neutral: "",
    brand: "text-brand-bright",
    mint: "text-mint",
    loss: "text-loss",
  }[tone];

  return (
    <div className={cn("panel px-5 py-4", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight md:text-[28px]",
          accent,
        )}
      >
        {value}
      </p>
      {(sub || delta !== undefined) && (
        <div className="mt-1.5 flex items-center gap-2 text-[12px] text-ink-muted">
          {delta !== undefined && <Delta value={delta} />}
          {sub && <span className="truncate">{sub}</span>}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Feedback
   ========================================================================== */

export function Alert({
  tone = "brand",
  title,
  children,
  className,
}: {
  tone?: "brand" | "mint" | "gold" | "loss";
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    brand: "border-brand/30 bg-brand/8 text-brand-bright",
    mint: "border-mint/30 bg-mint/8 text-mint",
    gold: "border-gold/30 bg-gold/8 text-gold",
    loss: "border-loss/30 bg-loss/8 text-loss",
  }[tone];

  return (
    <div
      role="status"
      className={cn("rounded-xl border px-4 py-3 text-sm", styles, className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn("text-ink-muted", title && "mt-1")}>{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-line-bright bg-surface-2 text-ink-faint">
          {icon}
        </div>
      )}
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ==========================================================================
   Data display
   ========================================================================== */

export function Table({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // Financial tables are wide by nature — scroll the table, never the page.
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[640px] text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-line px-4 py-3 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "left",
  mono = false,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  mono?: boolean;
}) {
  return (
    <td
      className={cn(
        "border-b border-line/60 px-4 py-3.5 text-ink",
        mono && "font-mono tabular-nums",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Horizontal meter used for allocations and progress toward a target. */
export function Meter({
  value,
  max = 100,
  tone = "brand",
  className,
  label,
}: {
  value: number;
  max?: number;
  tone?: "brand" | "mint" | "gold" | "violet" | "loss";
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = {
    brand: "bg-brand",
    mint: "bg-mint",
    gold: "bg-gold",
    violet: "bg-violet",
    loss: "bg-loss",
  }[tone];

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Small caps section label used above headings throughout the site. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand",
        className,
      )}
    >
      <span className="h-px w-6 bg-linear-to-r from-brand to-transparent" />
      {children}
    </p>
  );
}
