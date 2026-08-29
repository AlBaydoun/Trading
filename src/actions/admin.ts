"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireApprover, requireSuperAdmin } from "@/lib/auth/guards";
import { destroyAllSessionsForUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { reverseEntry } from "@/lib/ledger";
import {
  approveDeposit,
  rejectDeposit,
  approveWithdrawal,
  rejectWithdrawal,
  accrueReturn,
  adjustUserCash,
  closeInvestment,
  OperationError,
} from "@/lib/operations/money";
import {
  reviewSchema,
  accrualSchema,
  adjustmentSchema,
  userAdminSchema,
  fieldErrors,
} from "@/lib/validation";
import type { ActionState } from "@/lib/form-state";

/**
 * Admin actions.
 *
 * Two privilege tiers apply here. `requireAdmin` (ANALYST and above) is enough
 * to read the console; anything that moves money or changes a user's standing
 * calls `requireApprover` (ADMIN and above), so an analyst account can look at
 * everything and change nothing.
 *
 * Every one of these writes an audit entry naming the actor.
 */

function toState(error: unknown): ActionState {
  if (error instanceof OperationError) {
    return { ok: false, message: error.message };
  }
  console.error("[admin action]", error);
  return {
    ok: false,
    message: "The operation failed and nothing was changed. Check the logs.",
  };
}

function refreshAdmin(...paths: string[]) {
  revalidatePath("/admin");
  for (const path of paths) revalidatePath(path);
}

// -----------------------------------------------------------------------------
// Deposits
// -----------------------------------------------------------------------------

export async function reviewDepositAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireApprover();

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { id, decision, notes } = parsed.data;

  try {
    const before = await prisma.depositRequest.findUnique({ where: { id } });

    const result =
      decision === "APPROVE"
        ? await approveDeposit({ requestId: id, reviewerId: actor.id, notes })
        : await rejectDeposit({ requestId: id, reviewerId: actor.id, notes });

    await recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: decision === "APPROVE" ? "deposit.approve" : "deposit.reject",
      entityType: "DepositRequest",
      entityId: id,
      before: { status: before?.status, amount: before?.amount?.toString() },
      after: { status: result.status, notes },
    });

    refreshAdmin("/admin/deposits", "/dashboard");

    return {
      ok: true,
      message:
        decision === "APPROVE"
          ? `Deposit ${result.reference} approved and credited.`
          : `Deposit ${result.reference} declined.`,
    };
  } catch (error) {
    return toState(error);
  }
}

// -----------------------------------------------------------------------------
// Withdrawals
// -----------------------------------------------------------------------------

export async function reviewWithdrawalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireApprover();

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { id, decision, notes } = parsed.data;

  try {
    const before = await prisma.withdrawalRequest.findUnique({ where: { id } });

    const result =
      decision === "APPROVE"
        ? await approveWithdrawal({ requestId: id, reviewerId: actor.id, notes })
        : await rejectWithdrawal({ requestId: id, reviewerId: actor.id, notes });

    await recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: decision === "APPROVE" ? "withdrawal.approve" : "withdrawal.reject",
      entityType: "WithdrawalRequest",
      entityId: id,
      before: { status: before?.status, amount: before?.amount?.toString() },
      after: { status: result.status, notes },
    });

    refreshAdmin("/admin/withdrawals", "/dashboard");

    return {
      ok: true,
      message:
        decision === "APPROVE"
          ? `Withdrawal ${result.reference} approved — ${result.netAmount.toFixed(2)} USD to settle.`
          : `Withdrawal ${result.reference} declined and the hold released.`,
    };
  } catch (error) {
    return toState(error);
  }
}

// -----------------------------------------------------------------------------
// KYC
// -----------------------------------------------------------------------------

export async function reviewKycAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireApprover();

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { id, decision, notes } = parsed.data;

  if (decision === "REJECT" && !notes) {
    return {
      ok: false,
      errors: {
        notes: "Explain why — the investor sees this and needs to know what to fix.",
      },
    };
  }

  try {
    const submission = await prisma.kycSubmission.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
    if (!submission) return { ok: false, message: "Submission not found." };
    if (submission.status !== "PENDING") {
      return { ok: false, message: "This submission has already been decided." };
    }

    const approved = decision === "APPROVE";

    await prisma.$transaction(async (tx) => {
      await tx.kycSubmission.update({
        where: { id },
        data: {
          status: approved ? "APPROVED" : "REJECTED",
          reviewerId: actor.id,
          reviewNotes: notes || null,
          reviewedAt: new Date(),
          // Re-verification is required every two years.
          expiresAt: approved
            ? new Date(Date.now() + 730 * 86_400_000)
            : null,
        },
      });

      await tx.user.update({
        where: { id: submission.userId },
        data: { kycStatus: approved ? "APPROVED" : "REJECTED" },
      });

      await tx.notification.create({
        data: {
          userId: submission.userId,
          type: approved ? "SUCCESS" : "WARNING",
          title: approved ? "Identity verified" : "Verification not approved",
          body: approved
            ? "You can now deposit, invest and withdraw."
            : notes || "Please review the notes on your verification page and resubmit.",
          href: "/dashboard/verification",
        },
      });
    });

    await recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: approved ? "kyc.approve" : "kyc.reject",
      entityType: "KycSubmission",
      entityId: id,
      before: { status: submission.status },
      after: { status: approved ? "APPROVED" : "REJECTED", notes },
    });

    refreshAdmin("/admin/kyc", "/dashboard/verification");

    return {
      ok: true,
      message: approved ? "Identity approved." : "Submission rejected and the investor notified.",
    };
  } catch (error) {
    return toState(error);
  }
}

// -----------------------------------------------------------------------------
// Returns
// -----------------------------------------------------------------------------

export async function accrueReturnAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireApprover();

  const parsed = accrualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { investmentId, amount, ratePct, note } = parsed.data;

  try {
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      select: { lastAccrualAt: true, startedAt: true },
    });
    if (!investment) return { ok: false, message: "Investment not found." };

    const periodStart = investment.lastAccrualAt ?? investment.startedAt;
    const periodEnd = new Date();

    if (periodEnd <= periodStart) {
      return {
        ok: false,
        message: "A period has already been credited up to now for this position.",
      };
    }

    const updated = await accrueReturn({
      investmentId,
      amount: new Prisma.Decimal(amount),
      ratePct: new Prisma.Decimal(ratePct),
      periodStart,
      periodEnd,
      note,
      actorId: actor.id,
    });

    await recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "investment.accrue",
      entityType: "Investment",
      entityId: investmentId,
      after: {
        amount,
        ratePct,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        newValue: updated.currentValue.toString(),
      },
    });

    refreshAdmin("/admin/investments", "/dashboard/investments");

    return {
      ok: true,
      message: `${Number(amount) >= 0 ? "Return" : "Loss"} of ${Math.abs(Number(amount)).toFixed(2)} USD posted. Position now ${updated.currentValue.toFixed(2)}.`,
    };
  } catch (error) {
    return toState(error);
  }
}

export async function closePositionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireApprover();

  const investmentId = String(formData.get("investmentId") ?? "");
  if (!investmentId) return { ok: false, message: "Which position?" };

  try {
    const result = await closeInvestment({
      investmentId,
      actorId: actor.id,
      // An admin closing a position on the investor's behalf should not charge
      // them for an exit they did not choose.
      waiveEarlyExitFee: true,
      note: String(formData.get("note") ?? "") || null,
    });

    await recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "investment.close",
      entityType: "Investment",
      entityId: investmentId,
      after: { net: result.net.toString(), fees: result.totalFees.toString() },
    });

    refreshAdmin("/admin/investments", "/dashboard/investments");

    return {
      ok: true,
      message: `Position closed. ${result.net.toFixed(2)} USD returned to the investor's cash balance.`,
    };
  } catch (error) {
    return toState(error);
  }
}

// -----------------------------------------------------------------------------
// Manual adjustment
// -----------------------------------------------------------------------------

export async function adjustBalanceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireApprover();

  const parsed = adjustmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { userId, amount, direction, reason } = parsed.data;

  try {
    const result = await adjustUserCash({
      userId,
      amount: new Prisma.Decimal(amount),
      direction,
      reason,
      actorId: actor.id,
    });

    await recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "ledger.adjust",
      entityType: "User",
      entityId: userId,
      after: {
        amount,
        direction,
        reason,
        reference: result.reference,
        balance: result.balance?.toString(),
      },
    });

    refreshAdmin(`/admin/users/${userId}`, "/dashboard");

    return {
      ok: true,
      message: `${direction === "CREDIT" ? "Credited" : "Debited"} ${Number(amount).toFixed(2)} USD. Entry ${result.reference}.`,
    };
  } catch (error) {
    return toState(error);
  }
}

// -----------------------------------------------------------------------------
// Users
// -----------------------------------------------------------------------------

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireApprover();

  const parsed = userAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { userId, status, role, notes } = parsed.data;

  // Changing a role is a privilege escalation vector — only a super admin may.
  if (role) {
    const superAdmin = await requireSuperAdmin();
    if (!superAdmin) return { ok: false, message: "Not permitted." };
  }

  if (userId === actor.id && status && status !== "ACTIVE") {
    return { ok: false, message: "You cannot suspend your own account." };
  }

  try {
    const before = await prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, role: true, notes: true, email: true },
    });
    if (!before) return { ok: false, message: "User not found." };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(status ? { status } : {}),
        ...(role ? { role } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
      select: { status: true, role: true },
    });

    // A suspended or closed account must lose its sessions immediately, not
    // when the cookie happens to expire.
    if (status === "SUSPENDED" || status === "CLOSED") {
      await destroyAllSessionsForUser(userId);
    }

    await recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action:
        status === "SUSPENDED"
          ? "user.suspend"
          : role
            ? "user.role_change"
            : status === "ACTIVE"
              ? "user.reactivate"
              : "user.note",
      entityType: "User",
      entityId: userId,
      before,
      after: updated,
    });

    refreshAdmin("/admin/users", `/admin/users/${userId}`);

    return { ok: true, message: "Account updated." };
  } catch (error) {
    return toState(error);
  }
}

// -----------------------------------------------------------------------------
// Ledger corrections
// -----------------------------------------------------------------------------

export async function reverseEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireApprover();

  const entryId = String(formData.get("entryId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!entryId) return { ok: false, message: "Which entry?" };
  if (reason.length < 6) {
    return {
      ok: false,
      errors: { reason: "Give a reason — this becomes part of the permanent record." },
    };
  }

  try {
    const result = await prisma.$transaction((tx) =>
      reverseEntry(tx, entryId, reason, actor.id),
    );

    await recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "ledger.reverse",
      entityType: "JournalEntry",
      entityId: entryId,
      after: { reversalReference: result.reference, reason },
    });

    refreshAdmin("/admin/ledger");

    return {
      ok: true,
      message: `Reversal posted as ${result.reference}. The original entry is unchanged.`,
    };
  } catch (error) {
    return toState(error);
  }
}

// -----------------------------------------------------------------------------
// Plans
// -----------------------------------------------------------------------------

export async function togglePlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireApprover();

  const planId = String(formData.get("planId") ?? "");
  if (!planId) return { ok: false, message: "Which plan?" };

  try {
    const plan = await prisma.investmentPlan.findUnique({
      where: { id: planId },
      select: { isActive: true, name: true },
    });
    if (!plan) return { ok: false, message: "Plan not found." };

    await prisma.investmentPlan.update({
      where: { id: planId },
      data: { isActive: !plan.isActive },
    });

    await recordAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: plan.isActive ? "plan.archive" : "plan.update",
      entityType: "InvestmentPlan",
      entityId: planId,
      before: { isActive: plan.isActive },
      after: { isActive: !plan.isActive },
    });

    refreshAdmin("/admin/plans", "/plans");

    return {
      ok: true,
      message: `${plan.name} is now ${plan.isActive ? "closed to new allocations" : "open"}. Existing positions are unaffected.`,
    };
  } catch (error) {
    return toState(error);
  }
}

/** Read-only guard used by admin pages so ANALYST can view without changing. */
export async function assertAdminAccess() {
  return requireAdmin();
}
