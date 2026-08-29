"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { registerAction } from "@/actions/auth";
import { emptyFormState } from "@/lib/form-state";
import { assessPassword } from "@/lib/auth/password-policy";
import { Button } from "@/components/ui/button";
import {
  Field,
  Input,
  Select,
  Checkbox,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

/** A short list covering most sign-ups; extend as you open new markets. */
const COUNTRIES = [
  ["AE", "United Arab Emirates"], ["AU", "Australia"], ["BR", "Brazil"],
  ["CA", "Canada"], ["CH", "Switzerland"], ["CY", "Cyprus"], ["DE", "Germany"],
  ["DK", "Denmark"], ["EG", "Egypt"], ["ES", "Spain"], ["FI", "Finland"],
  ["FR", "France"], ["GB", "United Kingdom"], ["IE", "Ireland"], ["IN", "India"],
  ["IT", "Italy"], ["JO", "Jordan"], ["JP", "Japan"], ["KW", "Kuwait"],
  ["LB", "Lebanon"], ["MA", "Morocco"], ["NG", "Nigeria"], ["NL", "Netherlands"],
  ["NO", "Norway"], ["NZ", "New Zealand"], ["PL", "Poland"], ["PT", "Portugal"],
  ["QA", "Qatar"], ["SA", "Saudi Arabia"], ["SE", "Sweden"], ["SG", "Singapore"],
  ["TR", "Türkiye"], ["ZA", "South Africa"],
];

export function RegisterForm({ referral }: { referral?: string }) {
  const [state, formAction, pending] = useActionState(
    registerAction,
    emptyFormState,
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const strength = assessPassword(password);
  const meterTone = ["bg-loss", "bg-loss", "bg-gold", "bg-brand", "bg-mint"][
    strength.score
  ];

  return (
    <div>
      <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">
        Open an account
      </h1>
      <p className="mt-2 text-[14.5px] text-ink-muted">
        Already registered?{" "}
        <Link href="/login" className="text-brand-bright hover:text-mint">
          Sign in
        </Link>
        .
      </p>

      <form action={formAction} className="mt-8 space-y-5" noValidate>
        {state.message && <FormMessage>{state.message}</FormMessage>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required error={state.errors?.firstName}>
            <Input name="firstName" autoComplete="given-name" required />
          </Field>
          <Field label="Last name" required error={state.errors?.lastName}>
            <Input name="lastName" autoComplete="family-name" required />
          </Field>
        </div>

        <Field label="Email" required error={state.errors?.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field
          label="Country of residence"
          hint="Determines which rules apply to your account."
          error={state.errors?.country}
        >
          <Select name="country" defaultValue="">
            <option value="">Select a country</option>
            {COUNTRIES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Password"
          required
          error={state.errors?.password}
          hint="At least 10 characters with upper case, lower case and a number."
        >
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint transition-colors hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        {password.length > 0 && (
          <div aria-live="polite">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    index < strength.score ? meterTone : "bg-surface-3",
                  )}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-ink-muted">
              {strength.label}
              {strength.issues.length > 0 && (
                <span className="text-ink-faint"> — {strength.issues[0]}</span>
              )}
            </p>
          </div>
        )}

        <Field label="Confirm password" required error={state.errors?.confirmPassword}>
          <Input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>

        <Field
          label="Referral code"
          hint="Optional."
          error={state.errors?.referralCode}
        >
          <Input
            name="referralCode"
            defaultValue={referral}
            placeholder="AXIO000000"
            className="font-mono uppercase"
          />
        </Field>

        <div className="space-y-3 border-t border-line pt-5">
          <Checkbox
            name="acceptTerms"
            required
            label={
              <>
                I have read and accept the{" "}
                <Link href="/legal/terms" className="text-brand-bright hover:text-mint">
                  terms of service
                </Link>
                ,{" "}
                <Link href="/legal/privacy" className="text-brand-bright hover:text-mint">
                  privacy policy
                </Link>{" "}
                and{" "}
                <Link
                  href="/legal/risk-disclosure"
                  className="text-brand-bright hover:text-mint"
                >
                  risk disclosure
                </Link>
                .
              </>
            }
            description="The risk disclosure explains that you can lose money. Please actually read it."
          />
          {state.errors?.acceptTerms && (
            <p role="alert" className="text-[12px] font-medium text-loss">
              {state.errors.acceptTerms}
            </p>
          )}

          <Checkbox
            name="marketingOptIn"
            label="Send me market research and product updates"
            description="Unsubscribe at any time. We do not share your address."
          />
        </div>

        <Button type="submit" size="lg" loading={pending} className="w-full">
          {pending ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-[12px] leading-relaxed text-ink-faint">
          Creating an account is free and commits you to nothing. Identity
          verification is required before you can move funds.
        </p>
      </form>
    </div>
  );
}
