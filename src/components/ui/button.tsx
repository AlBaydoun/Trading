import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "success";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-xl transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:pointer-events-none disabled:opacity-45 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const variants: Record<Variant, string> = {
  // The one loud element on any given screen. Gradient + glow, used sparingly.
  primary:
    "bg-linear-to-b from-brand-bright to-brand-deep text-white shadow-[0_1px_0_0_rgba(255,255,255,0.22)_inset,0_10px_30px_-12px_rgba(91,140,255,0.75)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.3)_inset,0_16px_44px_-14px_rgba(91,140,255,0.95)] hover:brightness-110",
  secondary:
    "bg-surface-2 text-ink border border-line-bright hover:bg-surface-3 hover:border-brand/45",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-2",
  outline:
    "border border-line-bright text-ink hover:border-brand/60 hover:bg-brand/8",
  danger:
    "bg-loss/12 text-loss border border-loss/35 hover:bg-loss/20 hover:border-loss/55",
  success:
    "bg-mint/12 text-mint border border-mint/35 hover:bg-mint/20 hover:border-mint/55",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[15px]",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  /** Renders a spinner and blocks interaction. */
  loading?: boolean;
}

export type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      <span className={cn(loading && "opacity-70")}>{children}</span>
    </button>
  );
}

export type ButtonLinkProps = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "children" | "className">;

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  loading: _loading,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
