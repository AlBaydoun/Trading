"use client";

import * as React from "react";
import { useActionState } from "react";
import { createWithdrawalAction } from "@/actions/investor";
import { emptyActionState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import {
  Field,
  Input,
  MoneyInput,
  Select,
  Textarea,
  FormMessage,
} from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";

const FEE_PCT = 0.5;
const MINIMUM = 50;

const METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer", placeholder: "IBAN or account number" },
  { value: "BTC", label: "Bitcoin", placeholder: "bc1…" },
  { value: "ETH", label: "Ethereum", placeholder: "0x…" },
  { value: "USDT_TRC20", label: "USDT (TRC-20)", placeholder: "T…" },
];

export function WithdrawForm({
  availableCash,
  blocked,
}: {
  availableCash: number;
  blocked?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    createWithdrawalAction,
    emptyActionState,
  );
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("BANK_TRANSFER");

  const numeric = Number(amount.replace(/[^0-9.]/g, "")) || 0;
  const fee = Math.round(((numeric * FEE_PCT) / 100) * 100) / 100;
  const net = Math.max(0, numeric - fee);

  const tooSmall = numeric > 0 && numeric < MINIMUM;
  const tooLarge = numeric > availableCash;
  const selected = METHODS.find((m) => m.value === method)!;

  if (blocked) {
    return (
      <Alert tone="gold" title="Withdrawals are unavailable">
        {blocked}
      </Alert>
    );
  }

  return (
    <form action={formAction} className="panel space-y-5 p-6" noValidate>
      {state.message && <FormMessage ok={state.ok}>{state.message}</FormMessage>}

      <Field
        label="Amount to withdraw"
        required
        error={state.errors?.amount}
        hint={`Available ${formatMoney(availableCash)} · minimum ${formatMoney(MINIMUM)} · ${FEE_PCT}% fee`}
      >
        <MoneyInput
          name="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="500.00"
          required
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        {[0.25, 0.5, 1].map((fraction) => {
          const preset = Math.floor(availableCash * fraction * 100) / 100;
          if (preset < MINIMUM) return null;
          return (
            <button
              key={fraction}
              type="button"
              onClick={() => setAmount(preset.toFixed(2))}
              className="rounded-lg border border-line-bright px-2.5 py-1 font-mono text-[12px] text-ink-muted transition-colors hover:border-brand/50 hover:text-ink"
            >
              {fraction === 1 ? "All" : `${fraction * 100}%`}
            </button>
          );
        })}
      </div>

      {tooSmall && (
        <FormMessage>The minimum withdrawal is {formatMoney(MINIMUM)}.</FormMessage>
      )}
      {tooLarge && (
        <FormMessage>
          You have {formatMoney(availableCash)} available. Close a position first
          to free up more.
        </FormMessage>
      )}

      {numeric > 0 && !tooSmall && !tooLarge && (
        <dl className="rounded-xl border border-line bg-surface-2/60 p-4 text-[13.5px]">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Withdrawal amount</dt>
            <dd className="font-mono tabular-nums text-ink">{formatMoney(numeric)}</dd>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <dt className="text-ink-muted">Fee ({FEE_PCT}%)</dt>
            <dd className="font-mono tabular-nums text-loss">−{formatMoney(fee)}</dd>
          </div>
          <div className="mt-2.5 flex justify-between gap-4 border-t border-line pt-2.5">
            <dt className="font-medium text-ink">You receive</dt>
            <dd className="font-mono font-semibold tabular-nums text-mint">
              {formatMoney(net)}
            </dd>
          </div>
        </dl>
      )}

      <Field label="Send to" required error={state.errors?.method}>
        <Select
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          required
        >
          {METHODS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label={method === "BANK_TRANSFER" ? "IBAN or account number" : "Wallet address"}
        required
        error={state.errors?.destination}
        hint="Check this twice. Funds sent to a wrong address cannot be recovered."
      >
        <Input
          name="destination"
          placeholder={selected.placeholder}
          className="font-mono text-[13.5px]"
          required
        />
      </Field>

      {method === "BANK_TRANSFER" && (
        <Field
          label="Account holder name"
          required
          error={state.errors?.accountName}
          hint="Must match the name on your Axiom account."
        >
          <Input name="accountName" autoComplete="name" required />
        </Field>
      )}

      <Field label="Note" hint="Optional — anything operations should know." error={state.errors?.note}>
        <Textarea name="note" rows={3} maxLength={280} />
      </Field>

      <Button
        type="submit"
        size="lg"
        loading={pending}
        disabled={numeric < MINIMUM || tooLarge}
        className="w-full"
      >
        {pending ? "Submitting…" : `Withdraw ${numeric > 0 ? formatMoney(net) : ""}`}
      </Button>

      <p className="text-[12px] leading-relaxed text-ink-faint">
        Requests are reviewed the same business day. Bank transfers settle in one
        to three business days; crypto usually within hours. The destination is
        recorded now and cannot be changed after submission.
      </p>
    </form>
  );
}
