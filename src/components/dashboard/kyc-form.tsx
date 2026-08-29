"use client";

import * as React from "react";
import { useActionState } from "react";
import { submitKycAction } from "@/actions/investor";
import { emptyActionState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import {
  Field,
  Input,
  Select,
  Checkbox,
  FormMessage,
} from "@/components/ui/form";

const DOCUMENT_TYPES = [
  ["PASSPORT", "Passport"],
  ["NATIONAL_ID", "National ID card"],
  ["DRIVERS_LICENCE", "Driving licence"],
];

const SOURCES = [
  ["EMPLOYMENT", "Employment income"],
  ["BUSINESS_INCOME", "Business income"],
  ["INVESTMENTS", "Existing investments"],
  ["INHERITANCE", "Inheritance or gift"],
  ["SALE_OF_ASSETS", "Sale of property or assets"],
  ["SAVINGS", "Accumulated savings"],
  ["OTHER", "Other"],
];

const VOLUMES = [
  "Under $10,000 a year",
  "$10,000 – $50,000 a year",
  "$50,000 – $250,000 a year",
  "Over $250,000 a year",
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

function FileField({
  name,
  label,
  hint,
  required,
  error,
}: {
  name: string;
  label: string;
  hint: string;
  required?: boolean;
  error?: string;
}) {
  const [fileName, setFileName] = React.useState<string | null>(null);

  return (
    <Field label={label} hint={hint} required={required} error={error}>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line-bright bg-surface-2/50 px-4 py-3.5 transition-colors hover:border-brand/50 hover:bg-brand/5">
        <input
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required={required}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="sr-only"
        />
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line-bright bg-surface text-ink-faint">
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
            <path
              d="M8 11V3M8 3 4.5 6.5M8 3l3.5 3.5M2.5 12.5v.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0 text-[13.5px]">
          <span className="block truncate font-medium text-ink">
            {fileName ?? "Choose a file"}
          </span>
          <span className="block text-[12px] text-ink-faint">
            JPG, PNG, WebP or PDF · up to 8 MB
          </span>
        </span>
      </label>
    </Field>
  );
}

export function KycForm() {
  const [state, formAction, pending] = useActionState(
    submitKycAction,
    emptyActionState,
  );

  if (state.ok) {
    return <FormMessage ok>{state.message}</FormMessage>;
  }

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {state.message && <FormMessage>{state.message}</FormMessage>}

      <section className="panel p-6">
        <h2 className="font-display text-[16px] font-semibold text-ink">
          1 · Identity document
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Photograph the whole document, flat, with no glare and all four corners
          visible. Most rejections are a cropped edge.
        </p>

        <div className="mt-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Document type" required error={state.errors?.documentType}>
              <Select name="documentType" defaultValue="PASSPORT" required>
                {DOCUMENT_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Document number" required error={state.errors?.documentNumber}>
              <Input name="documentNumber" className="font-mono" required />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Expiry date" hint="Optional." error={state.errors?.documentExpiry}>
              <Input name="documentExpiry" type="date" />
            </Field>
            <Field label="Nationality" required error={state.errors?.nationality}>
              <Select name="nationality" defaultValue="" required>
                <option value="">Select</option>
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Date of birth" required error={state.errors?.dateOfBirth}>
            <Input name="dateOfBirth" type="date" required />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <FileField
              name="documentFront"
              label="Document — front"
              hint="The photo page for a passport."
              required
              error={state.errors?.documentFront}
            />
            <FileField
              name="documentBack"
              label="Document — back"
              hint="Required for ID cards and licences."
              error={state.errors?.documentBack}
            />
          </div>

          <FileField
            name="selfie"
            label="Selfie holding the document"
            hint="Your face and the document both clearly readable in one photo."
            required
            error={state.errors?.selfie}
          />
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-[16px] font-semibold text-ink">
          2 · Residential address
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Where you actually live. This determines which rules apply to your
          account, so a mailing address will not do.
        </p>

        <div className="mt-5 space-y-5">
          <Field label="Address line 1" required error={state.errors?.addressLine1}>
            <Input name="addressLine1" autoComplete="address-line1" required />
          </Field>
          <Field label="Address line 2" error={state.errors?.addressLine2}>
            <Input name="addressLine2" autoComplete="address-line2" />
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="City" required error={state.errors?.city}>
              <Input name="city" autoComplete="address-level2" required />
            </Field>
            <Field label="Region" error={state.errors?.region}>
              <Input name="region" autoComplete="address-level1" />
            </Field>
            <Field label="Postal code" required error={state.errors?.postalCode}>
              <Input name="postalCode" autoComplete="postal-code" required />
            </Field>
          </div>

          <Field label="Country" required error={state.errors?.country}>
            <Select name="country" defaultValue="" required>
              <option value="">Select</option>
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </Select>
          </Field>

          <FileField
            name="proofOfAddress"
            label="Proof of address"
            hint="Utility bill or bank statement issued in the last 3 months, showing your name and address."
            error={state.errors?.proofOfAddress}
          />
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-[16px] font-semibold text-ink">
          3 · Source of funds
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          This is the question that does the most work in anti-money-laundering
          checks. It is how legitimate savings are separated from proceeds of
          crime.
        </p>

        <div className="mt-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Where do the funds come from?" required error={state.errors?.sourceOfFunds}>
              <Select name="sourceOfFunds" defaultValue="" required>
                <option value="">Select</option>
                {SOURCES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Expected annual volume" error={state.errors?.expectedVolume}>
              <Select name="expectedVolume" defaultValue="">
                <option value="">Select</option>
                {VOLUMES.map((volume) => (
                  <option key={volume} value={volume}>{volume}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Occupation" error={state.errors?.occupation}>
              <Input name="occupation" autoComplete="organization-title" />
            </Field>
            <Field label="Tax residency" hint="If different from your country of residence." error={state.errors?.taxResidency}>
              <Select name="taxResidency" defaultValue="">
                <option value="">Same as residence</option>
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Checkbox
            name="isPep"
            label="I am, or am closely associated with, a politically exposed person"
            description="Holding public office, or being a close family member or associate of someone who does. This is not disqualifying — it means enhanced ongoing monitoring."
          />
        </div>
      </section>

      <div className="panel p-6">
        <p className="text-[13px] leading-relaxed text-ink-muted">
          By submitting you confirm the information is accurate and that the
          documents are genuine and belong to you. Providing false information is
          grounds for account closure and may be reported to the relevant
          authorities. Documents are encrypted at rest, accessible only to
          compliance staff, and deleted once the statutory retention period
          lapses.
        </p>
        <Button type="submit" size="lg" loading={pending} className="mt-5 w-full sm:w-auto">
          {pending ? "Submitting…" : "Submit for verification"}
        </Button>
      </div>
    </form>
  );
}
