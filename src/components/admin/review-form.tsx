"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { emptyActionState } from "@/lib/form-state";
import type { ActionState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Textarea, FormMessage } from "@/components/ui/form";

/**
 * Two-step approve/decline control shared by the deposit, withdrawal and KYC
 * queues. Approving money movement is irreversible without posting a reversal,
 * so the first click reveals a confirmation panel and the second commits.
 */
export function ReviewForm({
  id,
  action,
  approveLabel = "Approve",
  rejectLabel = "Decline",
  approveWarning,
  requireNoteOnReject = false,
  disabled,
}: {
  id: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  approveLabel?: string;
  rejectLabel?: string;
  approveWarning?: string;
  requireNoteOnReject?: boolean;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, emptyActionState);
  const [mode, setMode] = React.useState<"idle" | "APPROVE" | "REJECT">("idle");

  if (state.message) {
    return <FormMessage ok={state.ok}>{state.message}</FormMessage>;
  }

  if (disabled) {
    return (
      <p className="text-[12.5px] text-ink-faint">
        Analyst access — approval requires an admin account.
      </p>
    );
  }

  if (mode === "idle") {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="success" onClick={() => setMode("APPROVE")}>
          <Check className="size-4" />
          {approveLabel}
        </Button>
        <Button size="sm" variant="danger" onClick={() => setMode("REJECT")}>
          <X className="size-4" />
          {rejectLabel}
        </Button>
      </div>
    );
  }

  const approving = mode === "APPROVE";

  return (
    <form action={formAction} className="w-full max-w-md space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={mode} />

      {approving && approveWarning && (
        <p className="rounded-lg border border-gold/30 bg-gold/8 px-3 py-2 text-[12.5px] leading-relaxed text-gold">
          {approveWarning}
        </p>
      )}

      <Textarea
        name="notes"
        rows={2}
        placeholder={
          approving
            ? "Internal note (optional)"
            : requireNoteOnReject
              ? "Reason — the investor sees this"
              : "Reason (optional)"
        }
        required={!approving && requireNoteOnReject}
        className="text-[13px]"
      />
      {state.errors?.notes && (
        <p role="alert" className="text-[12px] font-medium text-loss">
          {state.errors.notes}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setMode("idle")}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          variant={approving ? "success" : "danger"}
          loading={pending}
          className="flex-1"
        >
          {pending ? "Working…" : `Confirm ${approving ? approveLabel : rejectLabel}`}
        </Button>
      </div>
    </form>
  );
}
