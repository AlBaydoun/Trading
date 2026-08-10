"use client";

import { useActionState } from "react";
import { adjustBalanceAction, updateUserAction } from "@/actions/admin";
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
import { PanelHeader } from "@/components/ui/primitives";

export function AdjustBalanceForm({
  userId,
  canApprove,
}: {
  userId: string;
  canApprove: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    adjustBalanceAction,
    emptyActionState,
  );

  return (
    <form action={formAction} className="panel" noValidate>
      <PanelHeader
        title="Manual adjustment"
        description="Corrections, goodwill credits and reconciliations. Posts a balanced entry against the platform equity account and is permanently auditable."
      />
      <div className="space-y-4 p-5">
        {state.message && <FormMessage ok={state.ok}>{state.message}</FormMessage>}

        <input type="hidden" name="userId" value={userId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Direction" required error={state.errors?.direction}>
            <Select name="direction" defaultValue="CREDIT" required>
              <option value="CREDIT">Credit — give the investor money</option>
              <option value="DEBIT">Debit — take money back</option>
            </Select>
          </Field>
          <Field label="Amount" required error={state.errors?.amount}>
            <MoneyInput name="amount" placeholder="0.00" required />
          </Field>
        </div>

        <Field
          label="Reason"
          required
          hint="The investor sees this on their transaction. Be specific."
          error={state.errors?.reason}
        >
          <Textarea name="reason" rows={2} required maxLength={400} />
        </Field>

        <Button type="submit" loading={pending} disabled={!canApprove} size="sm">
          {pending ? "Posting…" : "Post adjustment"}
        </Button>
        {!canApprove && (
          <p className="text-[12.5px] text-ink-faint">
            Analyst access — posting requires an admin account.
          </p>
        )}
      </div>
    </form>
  );
}

export function UserStatusForm({
  userId,
  status,
  role,
  notes,
  canApprove,
  canChangeRole,
}: {
  userId: string;
  status: string;
  role: string;
  notes: string;
  canApprove: boolean;
  canChangeRole: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateUserAction,
    emptyActionState,
  );

  return (
    <form action={formAction} className="panel" noValidate>
      <PanelHeader
        title="Account controls"
        description="Suspending an account ends every one of its sessions immediately."
      />
      <div className="space-y-4 p-5">
        {state.message && <FormMessage ok={state.ok}>{state.message}</FormMessage>}

        <input type="hidden" name="userId" value={userId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" error={state.errors?.status}>
            <Select name="status" defaultValue={status}>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CLOSED">Closed</option>
            </Select>
          </Field>

          {canChangeRole ? (
            <Field
              label="Role"
              hint="Only a super admin can change this."
              error={state.errors?.role}
            >
              <Select name="role" defaultValue={role}>
                <option value="USER">Investor</option>
                <option value="ANALYST">Analyst — read only</option>
                <option value="ADMIN">Admin — can approve</option>
                <option value="SUPER_ADMIN">Super admin</option>
              </Select>
            </Field>
          ) : (
            <Field label="Role" hint="Only a super admin can change this.">
              <Input defaultValue={role.replace("_", " ")} disabled readOnly />
            </Field>
          )}
        </div>

        <Field
          label="Internal notes"
          hint="Visible to staff only. Never shown to the investor."
          error={state.errors?.notes}
        >
          <Textarea name="notes" rows={3} defaultValue={notes} maxLength={2000} />
        </Field>

        <Button type="submit" loading={pending} disabled={!canApprove} size="sm">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
