"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, Copy, Landmark, Bitcoin, CircleDollarSign } from "lucide-react";
import { createDepositAction } from "@/actions/investor";
import { emptyActionState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Field, Input, MoneyInput, FormMessage } from "@/components/ui/form";
import { Alert, Badge } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface DepositInstructions {
  bankName: string;
  iban: string;
  swift: string;
  btc: string;
  eth: string;
  usdt: string;
}

type Method = "BANK_TRANSFER" | "BTC" | "ETH" | "USDT_TRC20";

const METHODS: {
  value: Method;
  label: string;
  icon: typeof Landmark;
  eta: string;
}[] = [
  { value: "BANK_TRANSFER", label: "Bank transfer", icon: Landmark, eta: "1 business day" },
  { value: "BTC", label: "Bitcoin", icon: Bitcoin, eta: "After 2 confirmations" },
  { value: "ETH", label: "Ethereum", icon: CircleDollarSign, eta: "After 12 confirmations" },
  { value: "USDT_TRC20", label: "USDT (TRC-20)", icon: CircleDollarSign, eta: "Usually minutes" },
];

const MINIMUM = 100;

export function DepositForm({
  instructions,
  blocked,
}: {
  instructions: DepositInstructions;
  blocked?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    createDepositAction,
    emptyActionState,
  );
  const [method, setMethod] = React.useState<Method>("BANK_TRANSFER");
  const [amount, setAmount] = React.useState("");

  const numeric = Number(amount.replace(/[^0-9.]/g, "")) || 0;
  const isBank = method === "BANK_TRANSFER";

  const destination =
    method === "BTC"
      ? instructions.btc
      : method === "ETH"
        ? instructions.eth
        : method === "USDT_TRC20"
          ? instructions.usdt
          : instructions.iban;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      <form action={formAction} className="panel space-y-5 p-6" noValidate>
        {state.message && (
          <FormMessage ok={state.ok}>{state.message}</FormMessage>
        )}

        {blocked && (
          <Alert tone="gold">{blocked}</Alert>
        )}

        <fieldset>
          <legend className="text-[13px] font-medium text-ink">
            How are you sending the funds?
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {METHODS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                  method === option.value
                    ? "border-brand/60 bg-brand/10"
                    : "border-line-bright hover:bg-surface-2",
                )}
              >
                <input
                  type="radio"
                  name="method"
                  value={option.value}
                  checked={method === option.value}
                  onChange={() => setMethod(option.value)}
                  className="sr-only"
                />
                <option.icon
                  className={cn(
                    "size-4.5 shrink-0",
                    method === option.value ? "text-brand-bright" : "text-ink-faint",
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium text-ink">
                    {option.label}
                  </span>
                  <span className="block text-[11.5px] text-ink-faint">
                    {option.eta}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          label="Amount you will send"
          required
          error={state.errors?.amount}
          hint={`Minimum ${formatMoney(MINIMUM)}. Tell us the amount so operations can match your payment.`}
        >
          <MoneyInput
            name="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000.00"
            required
          />
        </Field>

        {numeric > 0 && numeric < MINIMUM && (
          <FormMessage>The minimum deposit is {formatMoney(MINIMUM)}.</FormMessage>
        )}

        {isBank ? (
          <Field
            label="Your bank reference"
            hint="The reference you will put on the transfer, if you already know it."
            error={state.errors?.senderReference}
          >
            <Input name="senderReference" placeholder="e.g. your name or the payment ID" />
          </Field>
        ) : (
          <Field
            label="Transaction hash"
            hint="Paste it once you have sent — it lets us credit you immediately."
            error={state.errors?.txHash}
          >
            <Input name="txHash" placeholder="0x…" className="font-mono text-[13px]" />
          </Field>
        )}

        <Field
          label="Payment proof"
          hint="Optional. A screenshot or PDF receipt speeds up matching. JPG, PNG, WebP or PDF, up to 8 MB."
        >
          <input
            type="file"
            name="proof"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="block w-full text-[13px] text-ink-muted file:mr-3 file:rounded-lg file:border file:border-line-bright file:bg-surface-2 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-ink hover:file:bg-surface-3"
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          loading={pending}
          disabled={numeric < MINIMUM}
          className="w-full"
        >
          {pending ? "Creating request…" : "Create deposit request"}
        </Button>

        <p className="text-[12px] leading-relaxed text-ink-faint">
          Creating a request does not move money. Send the funds separately using
          the details alongside, then we credit your account once the payment is
          matched.
        </p>
      </form>

      {/* ------------------------------------------------ instructions --- */}
      <div className="panel h-fit p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-ink">
            Where to send it
          </h2>
          <Badge tone="outline">
            {METHODS.find((m) => m.value === method)?.label}
          </Badge>
        </div>

        <div className="mt-5 space-y-4">
          {isBank ? (
            <>
              <CopyRow label="Account name" value={instructions.bankName} />
              <CopyRow label="IBAN" value={instructions.iban} mono />
              <CopyRow label="SWIFT / BIC" value={instructions.swift} mono />
            </>
          ) : (
            <CopyRow
              label={`${METHODS.find((m) => m.value === method)?.label} address`}
              value={destination}
              mono
              wrap
            />
          )}
        </div>

        <div className="mt-6 space-y-3 border-t border-line pt-5 text-[13px] leading-relaxed text-ink-muted">
          <p className="font-medium text-ink">Before you send</p>
          <ul className="space-y-2">
            <li className="flex gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
              Send from an account in your own name. Third-party payments are
              returned to source.
            </li>
            {!isBank && (
              <li className="flex gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-loss" />
                Send only {METHODS.find((m) => m.value === method)?.label} on the
                stated network. Anything else is unrecoverable.
              </li>
            )}
            <li className="flex gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
              Deposits are free. Your bank or the network may still charge you.
            </li>
            <li className="flex gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
              Cash is not accepted in any form.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function CopyRow({
  label,
  value,
  mono = false,
  wrap = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wrap?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked by permissions policy — the value is still
      // selectable on screen, so failing silently is acceptable here.
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          {label}
        </p>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 text-[12px] text-ink-muted transition-colors hover:text-brand-bright"
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-mint" />
              <span className="text-mint">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <p
        className={cn(
          "mt-1.5 text-[14px] text-ink",
          mono && "font-mono text-[13px]",
          wrap ? "break-all" : "truncate",
        )}
      >
        {value}
      </p>
    </div>
  );
}
