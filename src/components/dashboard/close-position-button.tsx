"use client";

import * as React from "react";
import { useActionState } from "react";
import { closeInvestmentAction } from "@/actions/investor";
import { emptyActionState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { formatMoney } from "@/lib/money";

/**
 * Two-step close. Closing a position is irreversible and may trigger an early
 * exit fee, so the first click reveals what it will cost and the second one
 * commits.
 */
export function ClosePositionButton({
  investmentId,
  currentValue,
  earlyExitFeePct,
  isEarly,
  performanceFeePct,
  profit,
}: {
  investmentId: string;
  currentValue: number;
  earlyExitFeePct: number;
  isEarly: boolean;
  performanceFeePct: number;
  profit: number;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [state, formAction, pending] = useActionState(
    closeInvestmentAction,
    emptyActionState,
  );

  const performanceFee = profit > 0 ? (profit * performanceFeePct) / 100 : 0;
  const exitFee = isEarly ? (currentValue * earlyExitFeePct) / 100 : 0;
  const net = currentValue - performanceFee - exitFee;

  if (state.message) {
    return <FormMessage ok={state.ok}>{state.message}</FormMessage>;
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Close position
      </Button>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-sm space-y-3">
      <input type="hidden" name="investmentId" value={investmentId} />

      <div className="rounded-xl border border-line bg-surface-2/70 p-3.5 text-[12.5px]">
        <p className="font-medium text-ink">Closing returns cash to your balance</p>
        <dl className="mt-2.5 space-y-1.5">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Position value</dt>
            <dd className="font-mono tabular-nums text-ink">
              {formatMoney(currentValue)}
            </dd>
          </div>
          {performanceFee > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">
                Performance fee ({performanceFeePct.toFixed(0)}% of profit)
              </dt>
              <dd className="font-mono tabular-nums text-loss">
                −{formatMoney(performanceFee)}
              </dd>
            </div>
          )}
          {exitFee > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">
                Early exit fee ({earlyExitFeePct.toFixed(2)}%)
              </dt>
              <dd className="font-mono tabular-nums text-loss">
                −{formatMoney(exitFee)}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-line pt-1.5">
            <dt className="font-medium text-ink">You receive</dt>
            <dd className="font-mono font-semibold tabular-nums text-mint">
              {formatMoney(net)}
            </dd>
          </div>
        </dl>
        {isEarly && (
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-gold">
            This position is still inside its lock-up, so the early exit fee
            applies. Waiting until the unlock date avoids it.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          className="flex-1"
        >
          Keep it open
        </Button>
        <Button type="submit" variant="danger" size="sm" loading={pending} className="flex-1">
          {pending ? "Closing…" : "Confirm close"}
        </Button>
      </div>
    </form>
  );
}
