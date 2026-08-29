"use client";

import { useActionState } from "react";
import { Copy, Check } from "lucide-react";
import * as React from "react";
import { updateProfileAction, changePasswordAction } from "@/actions/auth";
import { emptyFormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import {
  Field,
  Input,
  Select,
  Checkbox,
  FormMessage,
} from "@/components/ui/form";
import { PanelHeader } from "@/components/ui/primitives";

const RISK_PROFILES = [
  ["CONSERVATIVE", "Conservative — capital preservation first"],
  ["BALANCED", "Balanced — moderate growth, moderate volatility"],
  ["GROWTH", "Growth — accepts meaningful drawdowns"],
  ["AGGRESSIVE", "Aggressive — maximum growth, severe drawdowns acceptable"],
];

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

export function ProfileForm({
  defaults,
}: {
  defaults: {
    firstName: string;
    lastName: string;
    phone: string;
    country: string;
    riskProfile: string;
    marketingOptIn: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    emptyFormState,
  );

  return (
    <form action={formAction} className="panel" noValidate>
      <PanelHeader
        title="Profile"
        description="Your legal name is taken from your verified documents and can only be changed by compliance."
      />
      <div className="space-y-5 p-6">
        {state.message && <FormMessage ok={state.ok}>{state.message}</FormMessage>}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" required error={state.errors?.firstName}>
            <Input name="firstName" defaultValue={defaults.firstName} required />
          </Field>
          <Field label="Last name" required error={state.errors?.lastName}>
            <Input name="lastName" defaultValue={defaults.lastName} required />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone" error={state.errors?.phone}>
            <Input name="phone" type="tel" defaultValue={defaults.phone} />
          </Field>
          <Field label="Country of residence" error={state.errors?.country}>
            <Select name="country" defaultValue={defaults.country}>
              <option value="">Not set</option>
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Risk profile"
          hint="Used to flag when a mandate looks out of step with what you told us. It does not restrict what you can invest in."
          error={state.errors?.riskProfile}
        >
          <Select name="riskProfile" defaultValue={defaults.riskProfile}>
            {RISK_PROFILES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Field>

        <Checkbox
          name="marketingOptIn"
          defaultChecked={defaults.marketingOptIn}
          label="Send me market research and product updates"
          description="Account and transaction emails are always sent — those are not marketing."
        />

        <Button type="submit" loading={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    emptyFormState,
  );

  return (
    <form action={formAction} className="panel" noValidate>
      <PanelHeader
        title="Password"
        description="Changing your password signs out every other device."
      />
      <div className="space-y-5 p-6">
        {state.message && <FormMessage ok={state.ok}>{state.message}</FormMessage>}

        <Field label="Current password" required error={state.errors?.currentPassword}>
          <Input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <Field
          label="New password"
          required
          hint="At least 10 characters with upper case, lower case and a number."
          error={state.errors?.newPassword}
        >
          <Input name="newPassword" type="password" autoComplete="new-password" required />
        </Field>

        <Field label="Confirm new password" required error={state.errors?.confirmPassword}>
          <Input name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field>

        <Button type="submit" loading={pending}>
          {pending ? "Updating…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

export function ReferralPanel({ code, siteUrl }: { code: string; siteUrl: string }) {
  const [copied, setCopied] = React.useState(false);
  const link = `${siteUrl}/register?ref=${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be blocked; the link is selectable on screen.
    }
  };

  return (
    <div className="panel">
      <PanelHeader
        title="Referral link"
        description="Share it with someone considering an account. Nothing is paid automatically — contact us to arrange a referral agreement."
      />
      <div className="space-y-3 p-6">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3.5 py-3">
          <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">
            {link}
          </code>
          <button
            type="button"
            onClick={copy}
            className="flex shrink-0 items-center gap-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-brand-bright"
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
        <p className="text-[12.5px] text-ink-faint">
          Your code is <span className="font-mono text-ink-muted">{code}</span>.
        </p>
      </div>
    </div>
  );
}
