"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Form primitives wired for accessibility by default: every control gets an id,
 * a programmatic label, and `aria-describedby` pointing at its hint and error.
 * Errors are announced politely rather than on every keystroke.
 */

const FieldContext = React.createContext<{
  id: string;
  errorId: string;
  hintId: string;
  hasError: boolean;
}>({ id: "", errorId: "", hintId: "", hasError: false });

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const reactId = React.useId();
  const id = `f${reactId.replace(/:/g, "")}`;

  return (
    <FieldContext.Provider
      value={{
        id,
        errorId: `${id}-error`,
        hintId: `${id}-hint`,
        hasError: Boolean(error),
      }}
    >
      <div className={cn("space-y-1.5", className)}>
        <label
          htmlFor={id}
          className="flex items-baseline justify-between text-[13px] font-medium text-ink"
        >
          <span>
            {label}
            {required && <span className="ml-1 text-brand">*</span>}
          </span>
        </label>

        {children}

        {hint && !error && (
          <p id={`${id}-hint`} className="text-[12px] leading-relaxed text-ink-faint">
            {hint}
          </p>
        )}
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="flex items-start gap-1.5 text-[12px] font-medium text-loss"
          >
            <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0" aria-hidden="true">
              <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 4.5v4.2M8 11.2v.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

const controlBase =
  "w-full rounded-xl border bg-surface-2/70 px-3.5 text-[15px] text-ink placeholder:text-ink-faint transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand/45 focus:border-brand/60 disabled:opacity-50 disabled:cursor-not-allowed";

function useFieldAria() {
  const ctx = React.useContext(FieldContext);
  return {
    id: ctx.id || undefined,
    "aria-invalid": ctx.hasError || undefined,
    "aria-describedby": ctx.hasError ? ctx.errorId : ctx.hintId,
  };
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const aria = useFieldAria();
  const ctx = React.useContext(FieldContext);

  return (
    <input
      {...aria}
      className={cn(
        controlBase,
        "h-11",
        ctx.hasError ? "border-loss/60" : "border-line-bright",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  rows = 5,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const aria = useFieldAria();
  const ctx = React.useContext(FieldContext);

  return (
    <textarea
      {...aria}
      rows={rows}
      className={cn(
        controlBase,
        "resize-y py-3 leading-relaxed",
        ctx.hasError ? "border-loss/60" : "border-line-bright",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const aria = useFieldAria();
  const ctx = React.useContext(FieldContext);

  return (
    <div className="relative">
      <select
        {...aria}
        className={cn(
          controlBase,
          "h-11 appearance-none pr-10",
          ctx.hasError ? "border-loss/60" : "border-line-bright",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-3.5 top-1/2 size-3 -translate-y-1/2 text-ink-faint"
        aria-hidden="true"
      >
        <path d="M2 4.5 L6 8.5 L10 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Currency input with a leading symbol and monospaced figures. */
export function MoneyInput({
  className,
  currency = "$",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { currency?: string }) {
  const aria = useFieldAria();
  const ctx = React.useContext(FieldContext);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[15px] text-ink-faint">
        {currency}
      </span>
      <input
        {...aria}
        inputMode="decimal"
        autoComplete="off"
        className={cn(
          controlBase,
          "h-12 pl-8 font-mono text-lg tabular-nums",
          ctx.hasError ? "border-loss/60" : "border-line-bright",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
  description?: React.ReactNode;
}) {
  const reactId = React.useId();
  const id = props.id ?? `c${reactId.replace(/:/g, "")}`;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        type="checkbox"
        id={id}
        className="mt-0.5 size-4 shrink-0 cursor-pointer appearance-none rounded border border-line-bright bg-surface-2 transition-colors checked:border-brand checked:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
          checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><path d=%22M3.5 8.5l3 3 6-7%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222.2%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] checked:bg-contain checked:bg-center checked:bg-no-repeat"
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer text-[13px] leading-relaxed text-ink-muted">
        {label}
        {description && (
          <span className="mt-0.5 block text-[12px] text-ink-faint">{description}</span>
        )}
      </label>
    </div>
  );
}

/** Inline banner for whole-form errors and confirmations. */
export function FormMessage({
  ok,
  children,
}: {
  ok?: boolean;
  children: React.ReactNode;
}) {
  if (!children) return null;

  return (
    <div
      role={ok ? "status" : "alert"}
      className={cn(
        "rounded-xl border px-4 py-3 text-[13px]",
        ok
          ? "border-mint/30 bg-mint/8 text-mint"
          : "border-loss/30 bg-loss/8 text-loss",
      )}
    >
      {children}
    </div>
  );
}
