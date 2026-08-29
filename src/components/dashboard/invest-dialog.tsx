"use client";

import * as React from "react";
import { useActionState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { investAction } from "@/actions/investor";
import { emptyActionState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Field, MoneyInput, Checkbox, FormMessage } from "@/components/ui/form";
import { Badge, Meter } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";

export interface InvestPlan {
  id: string;
  name: string;
  tagline: string;
  minimumAmount: number;
  maximumAmount: number | null;
  targetApyLow: number;
  targetApyHigh: number;
  lockupDays: number;
  managementFeePct: number;
  performanceFeePct: number;
  earlyExitFeePct: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
}

const RISK_TONE = {
  LOW: "mint",
  MODERATE: "brand",
  HIGH: "gold",
  VERY_HIGH: "loss",
} as const;

export function InvestDialog({
  plan,
  availableCash,
  disabled,
  disabledReason,
}: {
  plan: InvestPlan;
  availableCash: number;
  disabled?: boolean;
  disabledReason?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [state, formAction, pending] = useActionState(
    investAction,
    emptyActionState,
  );

  // Close on success, but only after the message has been rendered once so the
  // investor sees the confirmation rather than a dialog vanishing.
  React.useEffect(() => {
    if (!state.ok) return;
    const timer = setTimeout(() => setOpen(false), 2200);
    return () => clearTimeout(timer);
  }, [state.ok]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const numeric = Number(amount.replace(/[^0-9.]/g, "")) || 0;
  const projectedLow = (numeric * plan.targetApyLow) / 100;
  const projectedHigh = (numeric * plan.targetApyHigh) / 100;

  const tooSmall = numeric > 0 && numeric < plan.minimumAmount;
  const tooLarge = plan.maximumAmount !== null && numeric > plan.maximumAmount;
  const tooMuch = numeric > availableCash;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={disabled}
        size="sm"
        className="w-full sm:w-auto"
        title={disabled ? disabledReason ?? undefined : undefined}
      >
        Allocate
      </Button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-void/85 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="invest-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="panel relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-b-none sm:rounded-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
                <div>
                  <Badge tone={RISK_TONE[plan.riskLevel]} className="mb-2">
                    {plan.riskLevel.replace("_", " ").toLowerCase()} risk
                  </Badge>
                  <h2
                    id="invest-title"
                    className="font-display text-xl font-semibold text-ink"
                  >
                    Allocate to {plan.name}
                  </h2>
                  <p className="mt-1 text-[13px] text-ink-muted">{plan.tagline}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form action={formAction} className="space-y-5 px-6 py-5">
                <input type="hidden" name="planId" value={plan.id} />

                {state.message && (
                  <FormMessage ok={state.ok}>{state.message}</FormMessage>
                )}

                <Field
                  label="Amount to allocate"
                  required
                  error={state.errors?.amount}
                  hint={`Available cash ${formatMoney(availableCash)} · minimum ${formatMoney(plan.minimumAmount)}`}
                >
                  <MoneyInput
                    name="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={plan.minimumAmount.toFixed(2)}
                    required
                  />
                </Field>

                <div className="flex flex-wrap gap-2">
                  {[plan.minimumAmount, availableCash * 0.25, availableCash * 0.5, availableCash]
                    .filter((v) => v >= plan.minimumAmount && v <= availableCash)
                    .map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setAmount(preset.toFixed(2))}
                        className="rounded-lg border border-line-bright px-2.5 py-1 font-mono text-[12px] text-ink-muted transition-colors hover:border-brand/50 hover:text-ink"
                      >
                        {index === 0 ? "Min" : index === 3 ? "All" : `${index * 25}%`}
                      </button>
                    ))}
                </div>

                {tooSmall && (
                  <FormMessage>
                    Below the {formatMoney(plan.minimumAmount)} minimum for this mandate.
                  </FormMessage>
                )}
                {tooLarge && plan.maximumAmount !== null && (
                  <FormMessage>
                    Above the {formatMoney(plan.maximumAmount)} cap for a single allocation.
                  </FormMessage>
                )}
                {tooMuch && (
                  <FormMessage>
                    You have {formatMoney(availableCash)} available. Deposit more first.
                  </FormMessage>
                )}

                {numeric > 0 && !tooSmall && !tooMuch && (
                  <div className="rounded-xl border border-line bg-surface-2/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                      If the target range holds for a year
                    </p>
                    <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-ink">
                      {formatMoney(numeric + projectedLow)} –{" "}
                      {formatMoney(numeric + projectedHigh)}
                    </p>
                    <p className="mt-1 font-mono text-[12px] tabular-nums text-mint">
                      +{formatMoney(projectedLow)} to +{formatMoney(projectedHigh)} before fees
                    </p>
                    <Meter
                      value={plan.riskLevel === "LOW" ? 25 : plan.riskLevel === "MODERATE" ? 50 : plan.riskLevel === "HIGH" ? 75 : 100}
                      tone={RISK_TONE[plan.riskLevel]}
                      className="mt-3"
                      label="Risk level"
                    />
                    <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
                      This is arithmetic on a target, not a projection. The
                      mandate can also lose money — see the plan page for the
                      drawdown it is built to tolerate.
                    </p>
                  </div>
                )}

                <dl className="space-y-2 border-t border-line pt-4 text-[13px]">
                  {[
                    ["Lock-up", plan.lockupDays === 0 ? "None" : `${plan.lockupDays} days`],
                    ["Management fee", `${plan.managementFeePct.toFixed(2)}% p.a.`],
                    ["Performance fee", `${plan.performanceFeePct.toFixed(0)}% of profit`],
                    ["Early exit fee", `${plan.earlyExitFeePct.toFixed(2)}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-ink-muted">{label}</dt>
                      <dd className="font-mono tabular-nums text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>

                {plan.lockupDays > 0 && (
                  <Checkbox
                    name="autoRenew"
                    label="Roll over automatically at maturity"
                    description="You can turn this off any time before the unlock date."
                  />
                )}

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={pending}
                    disabled={numeric <= 0 || tooSmall || tooMuch || tooLarge}
                    className="flex-1"
                  >
                    {pending ? "Allocating…" : "Confirm allocation"}
                  </Button>
                </div>

                <p className="text-center text-[11.5px] text-ink-faint">
                  Capital at risk. You may get back less than you allocate.
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
