"use client";

import * as React from "react";
import { useActionState } from "react";
import { accrueReturnAction, closePositionAction } from "@/actions/admin";
import { emptyActionState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, FormMessage } from "@/components/ui/form";
import { formatMoney } from "@/lib/money";

/**
 * Posts one return period against a position. The rate and the amount are
 * entered independently on purpose: the amount is what actually moves in the
 * ledger, and the rate is recorded alongside it as the justification. A helper
 * converts one into the other so the two cannot silently disagree.
 */
export function AccrualForm({
  investmentId,
  currentValue,
  canApprove,
}: {
  investmentId: string;
  currentValue: number;
  canApprove: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    accrueReturnAction,
    emptyActionState,
  );
  const [open, setOpen] = React.useState(false);
  const [rate, setRate] = React.useState("");
  const [amount, setAmount] = React.useState("");

  const applyRate = (value: string) => {
    setRate(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && currentValue > 0) {
      setAmount(((currentValue * parsed) / 100).toFixed(2));
    }
  };

  if (!canApprove) {
    return (
      <p className="text-[12.5px] text-ink-faint">
        Analyst access — posting returns requires an admin account.
      </p>
    );
  }

  if (state.message) {
    return <FormMessage ok={state.ok}>{state.message}</FormMessage>;
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Post return
      </Button>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-lg space-y-3">
      <input type="hidden" name="investmentId" value={investmentId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Period rate %" required error={state.errors?.ratePct}>
          <Input
            name="ratePct"
            value={rate}
            onChange={(e) => applyRate(e.target.value)}
            placeholder="1.40"
            inputMode="decimal"
            className="font-mono"
            required
          />
        </Field>
        <Field
          label="Amount"
          required
          hint="Negative for a loss."
          error={state.errors?.amount}
        >
          <Input
            name="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            className="font-mono"
            required
          />
        </Field>
      </div>

      <p className="text-[12px] text-ink-faint">
        Position is {formatMoney(currentValue)}. After this it would be{" "}
        <span className="font-mono text-ink-muted">
          {formatMoney(currentValue + (Number(amount) || 0))}
        </span>
        .
      </p>

      <Field label="Note" error={state.errors?.note}>
        <Textarea
          name="note"
          rows={2}
          maxLength={280}
          placeholder="What drove the period result"
          className="text-[13px]"
        />
      </Field>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending} className="flex-1">
          {pending ? "Posting…" : "Post to ledger"}
        </Button>
      </div>
    </form>
  );
}

export function AdminClosePositionForm({
  investmentId,
  canApprove,
}: {
  investmentId: string;
  canApprove: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    closePositionAction,
    emptyActionState,
  );
  const [confirming, setConfirming] = React.useState(false);

  if (!canApprove) return null;

  if (state.message) {
    return <FormMessage ok={state.ok}>{state.message}</FormMessage>;
  }

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
        Close position
      </Button>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-md space-y-3">
      <input type="hidden" name="investmentId" value={investmentId} />
      <p className="rounded-lg border border-gold/30 bg-gold/8 px-3 py-2 text-[12.5px] leading-relaxed text-gold">
        Closing on the investor&apos;s behalf waives the early exit fee — they did
        not choose to exit. The performance fee on profit still applies.
      </p>
      <Textarea
        name="note"
        rows={2}
        placeholder="Reason for closing"
        className="text-[13px]"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setConfirming(false)}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" variant="danger" loading={pending} className="flex-1">
          {pending ? "Closing…" : "Confirm close"}
        </Button>
      </div>
    </form>
  );
}
