"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { submitContactAction } from "@/actions/contact";
import { emptyContactState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import {
  Field,
  Input,
  Select,
  Textarea,
  FormMessage,
} from "@/components/ui/form";

const INVESTMENT_RANGES = [
  "Under $10,000",
  "$10,000 – $50,000",
  "$50,000 – $250,000",
  "$250,000 – $1,000,000",
  "Over $1,000,000",
  "Prefer not to say",
];

const SUBJECTS = [
  "Choosing a mandate",
  "Account opening or verification",
  "Deposits and withdrawals",
  "Fees and charges",
  "Custody and security",
  "Something else",
];

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactAction,
    emptyContactState,
  );

  if (state.ok) {
    return (
      <div className="panel flex flex-col items-center px-8 py-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-mint/35 bg-mint/10 text-mint">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="mt-6 font-display text-xl font-semibold text-ink">
          Message received
        </h2>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-muted">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="panel space-y-5 p-6 md:p-8" noValidate>
      {state.message && !state.ok && (
        <FormMessage>{state.message}</FormMessage>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" required error={state.errors?.name}>
          <Input name="name" autoComplete="name" placeholder="Layla Baydoun" required />
        </Field>

        <Field label="Email" required error={state.errors?.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Phone"
          hint="Optional — only if you would prefer a call."
          error={state.errors?.phone}
        >
          <Input name="phone" type="tel" autoComplete="tel" placeholder="+971 50 000 0000" />
        </Field>

        <Field label="Amount you are considering" error={state.errors?.investmentRange}>
          <Select name="investmentRange" defaultValue="">
            <option value="">Select a range</option>
            {INVESTMENT_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="What is this about?" required error={state.errors?.subject}>
        <Select name="subject" defaultValue={SUBJECTS[0]} required>
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Your message"
        required
        hint="The more specific you are about your horizon and risk tolerance, the more useful the answer."
        error={state.errors?.message}
      >
        <Textarea
          name="message"
          rows={6}
          minLength={20}
          placeholder="I have a five-year horizon and could tolerate a 30% drawdown without selling. Which mandate fits?"
          required
        />
      </Field>

      {/* Honeypot — hidden from users, irresistible to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] leading-relaxed text-ink-faint">
          We use your details only to reply. Read the{" "}
          <Link href="/legal/privacy" className="text-brand-bright hover:text-mint">
            privacy policy
          </Link>
          .
        </p>
        <Button type="submit" loading={pending} size="lg" className="shrink-0">
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
