"use client";

import * as React from "react";
import { useActionState } from "react";
import { Undo2 } from "lucide-react";
import { reverseEntryAction, togglePlanAction } from "@/actions/admin";
import { emptyActionState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Textarea, FormMessage } from "@/components/ui/form";

export function ReverseEntryForm({
  entryId,
  canApprove,
}: {
  entryId: string;
  canApprove: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    reverseEntryAction,
    emptyActionState,
  );
  const [open, setOpen] = React.useState(false);

  if (!canApprove) return null;

  if (state.message) {
    return <FormMessage ok={state.ok}>{state.message}</FormMessage>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-faint transition-colors hover:text-loss"
      >
        <Undo2 className="size-3.5" />
        Reverse this entry
      </button>
    );
  }

  return (
    <form action={formAction} className="max-w-md space-y-2.5">
      <input type="hidden" name="entryId" value={entryId} />
      <p className="text-[12.5px] leading-relaxed text-ink-muted">
        This posts a mirror entry that cancels the original. The original stays
        in the ledger — that is the point.
      </p>
      <Textarea
        name="reason"
        rows={2}
        required
        placeholder="Why is this being reversed?"
        className="text-[13px]"
      />
      {state.errors?.reason && (
        <p role="alert" className="text-[12px] font-medium text-loss">
          {state.errors.reason}
        </p>
      )}
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
        <Button type="submit" size="sm" variant="danger" loading={pending} className="flex-1">
          {pending ? "Posting…" : "Post reversal"}
        </Button>
      </div>
    </form>
  );
}

export function TogglePlanForm({
  planId,
  isActive,
  canApprove,
}: {
  planId: string;
  isActive: boolean;
  canApprove: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    togglePlanAction,
    emptyActionState,
  );

  if (state.message) {
    return <FormMessage ok={state.ok}>{state.message}</FormMessage>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="planId" value={planId} />
      <Button
        type="submit"
        size="sm"
        variant={isActive ? "ghost" : "success"}
        loading={pending}
        disabled={!canApprove}
      >
        {isActive ? "Close to new allocations" : "Reopen"}
      </Button>
    </form>
  );
}
