"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { transactionBlockReason } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { checkLimit, retryAfterMessage } from "@/lib/rate-limit";
import { saveUpload, isOptionalFile, UploadError } from "@/lib/uploads";
import {
  createDepositRequest,
  createWithdrawalRequest,
  openInvestment,
  closeInvestment,
  OperationError,
} from "@/lib/operations/money";
import {
  depositSchema,
  withdrawalSchema,
  investSchema,
  kycSchema,
  fieldErrors,
  checkboxToBool,
} from "@/lib/validation";
import type { ActionState } from "@/lib/form-state";

/** Turns any thrown value into a message safe to show an investor. */
function toState(error: unknown): ActionState {
  if (error instanceof OperationError || error instanceof UploadError) {
    return { ok: false, message: error.message };
  }
  console.error("[investor action]", error);
  return {
    ok: false,
    message: "Something went wrong on our side. Nothing was changed — try again.",
  };
}

// -----------------------------------------------------------------------------
// Deposits
// -----------------------------------------------------------------------------

export async function createDepositAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const limit = checkLimit("deposit", user.id);
  if (!limit.ok) return { ok: false, message: retryAfterMessage(limit) };

  const parsed = depositSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  try {
    const proof = formData.get("proof");
    const saved = isOptionalFile(proof)
      ? await saveUpload(proof, { userId: user.id, kind: "deposit-proof" })
      : null;

    const request = await createDepositRequest({
      userId: user.id,
      amount: new Prisma.Decimal(parsed.data.amount),
      method: parsed.data.method,
      senderReference: parsed.data.senderReference,
      txHash: parsed.data.txHash,
      proofPath: saved?.key ?? null,
    });

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "deposit.create",
      entityType: "DepositRequest",
      entityId: request.id,
      after: {
        amount: request.amount.toString(),
        method: request.method,
        reference: request.reference,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/deposit");
    revalidatePath("/dashboard/transactions");

    return {
      ok: true,
      message: `Deposit request ${request.reference} created. Send the funds using that reference and we will credit your account once it arrives.`,
    };
  } catch (error) {
    return toState(error);
  }
}

// -----------------------------------------------------------------------------
// Withdrawals
// -----------------------------------------------------------------------------

export async function createWithdrawalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const blocked = transactionBlockReason(user);
  if (blocked) return { ok: false, message: blocked };

  const limit = checkLimit("withdrawal", user.id);
  if (!limit.ok) return { ok: false, message: retryAfterMessage(limit) };

  const parsed = withdrawalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  try {
    const data = parsed.data;

    const request = await createWithdrawalRequest({
      userId: user.id,
      amount: new Prisma.Decimal(data.amount),
      method: data.method,
      destination: {
        method: data.method,
        destination: data.destination,
        accountName: data.accountName || null,
        note: data.note || null,
        // Captured at request time so a later profile edit cannot retroactively
        // change where money was sent.
        capturedAt: new Date().toISOString(),
      },
    });

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "withdrawal.create",
      entityType: "WithdrawalRequest",
      entityId: request.id,
      after: {
        amount: request.amount.toString(),
        fee: request.feeAmount.toString(),
        net: request.netAmount.toString(),
        method: request.method,
        reference: request.reference,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/withdraw");
    revalidatePath("/dashboard/transactions");

    return {
      ok: true,
      message: `Withdrawal ${request.reference} submitted for ${request.netAmount.toFixed(2)} USD net of the ${request.feeAmount.toFixed(2)} fee. It is reviewed the same business day.`,
    };
  } catch (error) {
    return toState(error);
  }
}

// -----------------------------------------------------------------------------
// Investing
// -----------------------------------------------------------------------------

export async function investAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const blocked = transactionBlockReason(user);
  if (blocked) return { ok: false, message: blocked };

  const parsed = investSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  try {
    const investment = await openInvestment({
      userId: user.id,
      planId: parsed.data.planId,
      amount: new Prisma.Decimal(parsed.data.amount),
      autoRenew: checkboxToBool(parsed.data.autoRenew),
    });

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "investment.open",
      entityType: "Investment",
      entityId: investment.id,
      after: {
        principal: investment.principal.toString(),
        planId: investment.planId,
        reference: investment.reference,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/investments");
    revalidatePath("/dashboard/transactions");

    return {
      ok: true,
      message: `Position ${investment.reference} opened for ${investment.principal.toFixed(2)} USD.`,
    };
  } catch (error) {
    return toState(error);
  }
}

export async function closeInvestmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const investmentId = String(formData.get("investmentId") ?? "");
  if (!investmentId) return { ok: false, message: "Which position?" };

  // Ownership check before anything else — never trust an id from a form.
  const owned = await prisma.investment.findFirst({
    where: { id: investmentId, userId: user.id },
    select: { id: true },
  });
  if (!owned) return { ok: false, message: "Position not found." };

  try {
    const result = await closeInvestment({
      investmentId,
      actorId: user.id,
    });

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "investment.close",
      entityType: "Investment",
      entityId: investmentId,
      after: {
        net: result.net.toString(),
        fees: result.totalFees.toString(),
        profit: result.profit.toString(),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/investments");
    revalidatePath("/dashboard/transactions");

    return {
      ok: true,
      message: `Position closed. ${result.net.toFixed(2)} USD returned to your cash balance${result.totalFees.gt(0) ? ` after ${result.totalFees.toFixed(2)} in fees` : ""}.`,
    };
  } catch (error) {
    return toState(error);
  }
}

// -----------------------------------------------------------------------------
// KYC
// -----------------------------------------------------------------------------

export async function submitKycAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  if (user.kycStatus === "APPROVED") {
    return { ok: false, message: "Your identity is already verified." };
  }
  if (user.kycStatus === "PENDING") {
    return {
      ok: false,
      message: "A submission is already under review. We will email you when it is decided.",
    };
  }

  const parsed = kycSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const front = formData.get("documentFront");
  const selfie = formData.get("selfie");

  if (!isOptionalFile(front)) {
    return { ok: false, errors: { documentFront: "Upload the front of your document." } };
  }
  if (!isOptionalFile(selfie)) {
    return { ok: false, errors: { selfie: "Upload a selfie holding your document." } };
  }

  try {
    const data = parsed.data;
    const back = formData.get("documentBack");
    const address = formData.get("proofOfAddress");

    const [frontSaved, selfieSaved, backSaved, addressSaved] = await Promise.all([
      saveUpload(front, { userId: user.id, kind: "id-front" }),
      saveUpload(selfie, { userId: user.id, kind: "selfie" }),
      isOptionalFile(back)
        ? saveUpload(back, { userId: user.id, kind: "id-back" })
        : Promise.resolve(null),
      isOptionalFile(address)
        ? saveUpload(address, { userId: user.id, kind: "address" })
        : Promise.resolve(null),
    ]);

    const submission = await prisma.$transaction(async (tx) => {
      const created = await tx.kycSubmission.create({
        data: {
          userId: user.id,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          documentExpiry: data.documentExpiry ? new Date(data.documentExpiry) : null,
          dateOfBirth: new Date(data.dateOfBirth),
          nationality: data.nationality,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2 || null,
          city: data.city,
          region: data.region || null,
          postalCode: data.postalCode,
          country: data.country,
          occupation: data.occupation || null,
          sourceOfFunds: data.sourceOfFunds,
          expectedVolume: data.expectedVolume || null,
          isPep: checkboxToBool(data.isPep),
          taxResidency: data.taxResidency || null,
          documentFrontPath: frontSaved.key,
          documentBackPath: backSaved?.key ?? null,
          selfiePath: selfieSaved.key,
          proofOfAddress: addressSaved?.key ?? null,
          status: "PENDING",
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { kycStatus: "PENDING", country: data.country },
      });

      return created;
    });

    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "kyc.submit",
      entityType: "KycSubmission",
      entityId: submission.id,
      // Document number is redacted by the audit writer.
      after: { country: data.country, sourceOfFunds: data.sourceOfFunds },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/verification");

    return {
      ok: true,
      message:
        "Submitted. Most checks clear within one business day and we will email you as soon as it is decided.",
    };
  } catch (error) {
    return toState(error);
  }
}

// -----------------------------------------------------------------------------
// Notifications
// -----------------------------------------------------------------------------

export async function markNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard");
}
