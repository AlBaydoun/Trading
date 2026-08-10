import "server-only";

import {
  DepositMethod,
  EntryType,
  InvestmentStatus,
  LedgerDirection,
  Prisma,
  RequestStatus,
  TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SYSTEM_ACCOUNTS,
  ensureUserAccounts,
  postEntry,
  userAccountCode,
} from "@/lib/ledger";
import { dec, generateReference, roundCents } from "@/lib/money";

/**
 * =============================================================================
 * MONEY OPERATIONS
 * =============================================================================
 * Each function below is the *only* supported way to move value for its case.
 * They all run inside a single database transaction that writes, together:
 *   1. the balanced journal entry,
 *   2. the business record (request / investment),
 *   3. the investor-facing Transaction row,
 *   4. a notification.
 * If any part fails, none of it happened.
 *
 * Callers (server actions) handle authorisation and audit logging. These
 * functions assume the caller is already authorised.
 * =============================================================================
 */

export class OperationError extends Error {
  code: string;
  constructor(message: string, code = "operation_failed") {
    super(message);
    this.name = "OperationError";
    this.code = code;
  }
}

/** Crypto deposits land in custody; fiat lands in the bank account. */
const CRYPTO_METHODS = new Set<DepositMethod>([
  DepositMethod.BTC,
  DepositMethod.ETH,
  DepositMethod.USDT_TRC20,
  DepositMethod.USDT_ERC20,
]);

function settlementAccount(method: DepositMethod): string {
  return CRYPTO_METHODS.has(method)
    ? SYSTEM_ACCOUNTS.CUSTODY_CRYPTO.code
    : SYSTEM_ACCOUNTS.BANK_FIAT.code;
}

/** Flat percentage charged on withdrawals. Move to `settings` when it varies. */
export const WITHDRAWAL_FEE_PCT = new Prisma.Decimal("0.5");
export const MIN_WITHDRAWAL = new Prisma.Decimal("50");
export const MIN_DEPOSIT = new Prisma.Decimal("100");

export function withdrawalFee(amount: Prisma.Decimal): Prisma.Decimal {
  return roundCents(amount.mul(WITHDRAWAL_FEE_PCT).div(100));
}

/**
 * Cash the investor can actually spend: the ledger balance minus anything
 * already committed to a withdrawal that has not been approved or rejected yet.
 * Without this, two concurrent full-balance withdrawals could both be approved.
 */
export async function getAvailableCash(
  userId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<Prisma.Decimal> {
  const [account, pending] = await Promise.all([
    client.ledgerAccount.findUnique({
      where: { code: userAccountCode(userId, "cash") },
      select: { balance: true },
    }),
    client.withdrawalRequest.aggregate({
      where: {
        userId,
        status: { in: [RequestStatus.PENDING, RequestStatus.UNDER_REVIEW] },
      },
      _sum: { amount: true },
    }),
  ]);

  const balance = account?.balance ?? new Prisma.Decimal(0);
  const held = pending._sum.amount ?? new Prisma.Decimal(0);
  return balance.sub(held);
}

// -----------------------------------------------------------------------------
// Deposits
// -----------------------------------------------------------------------------

export async function createDepositRequest(input: {
  userId: string;
  amount: Prisma.Decimal;
  method: DepositMethod;
  senderReference?: string | null;
  txHash?: string | null;
  proofPath?: string | null;
}) {
  if (input.amount.lt(MIN_DEPOSIT)) {
    throw new OperationError(
      `The minimum deposit is ${MIN_DEPOSIT.toFixed(0)} USD.`,
      "below_minimum",
    );
  }

  return prisma.$transaction(async (tx) => {
    await ensureUserAccounts(tx, input.userId);

    const request = await tx.depositRequest.create({
      data: {
        reference: generateReference("DEP"),
        userId: input.userId,
        amount: input.amount,
        method: input.method,
        senderReference: input.senderReference || null,
        txHash: input.txHash || null,
        proofPath: input.proofPath || null,
        status: RequestStatus.PENDING,
      },
    });

    // Shown to the investor immediately, marked pending — no ledger impact
    // until an approver signs off.
    await tx.transaction.create({
      data: {
        userId: input.userId,
        type: TransactionType.DEPOSIT,
        status: "PENDING",
        amount: input.amount,
        description: `Deposit via ${humanMethod(input.method)} — awaiting confirmation`,
        reference: request.reference,
      },
    });

    return request;
  });
}

export async function approveDeposit(input: {
  requestId: string;
  reviewerId: string;
  notes?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.depositRequest.findUnique({
      where: { id: input.requestId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!request) throw new OperationError("Deposit request not found.", "not_found");
    if (request.status === RequestStatus.APPROVED) {
      throw new OperationError("This deposit is already approved.", "already_approved");
    }
    if (request.status === RequestStatus.REJECTED || request.status === RequestStatus.CANCELLED) {
      throw new OperationError("This deposit was already closed.", "closed");
    }

    await ensureUserAccounts(tx, request.userId, request.currency);

    const { entryId } = await postEntry(tx, {
      type: EntryType.DEPOSIT,
      description: `Deposit ${request.reference} approved`,
      currency: request.currency,
      createdById: input.reviewerId,
      metadata: {
        depositId: request.id,
        method: request.method,
        txHash: request.txHash,
      },
      lines: [
        {
          accountCode: settlementAccount(request.method),
          direction: LedgerDirection.DEBIT,
          amount: request.amount,
          memo: `Funds received — ${request.reference}`,
        },
        {
          accountCode: userAccountCode(request.userId, "cash"),
          direction: LedgerDirection.CREDIT,
          amount: request.amount,
          memo: `Deposit credited — ${request.reference}`,
        },
      ],
    });

    const cash = await tx.ledgerAccount.findUnique({
      where: { code: userAccountCode(request.userId, "cash") },
      select: { balance: true },
    });

    const updated = await tx.depositRequest.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.APPROVED,
        reviewerId: input.reviewerId,
        reviewNotes: input.notes || null,
        reviewedAt: new Date(),
        journalEntryId: entryId,
      },
    });

    await tx.transaction.updateMany({
      where: { reference: request.reference, userId: request.userId },
      data: {
        status: "COMPLETED",
        description: `Deposit via ${humanMethod(request.method)}`,
        balanceAfter: cash?.balance,
        journalEntryId: entryId,
      },
    });

    await tx.notification.create({
      data: {
        userId: request.userId,
        type: "SUCCESS",
        title: "Deposit confirmed",
        body: `${request.amount.toFixed(2)} ${request.currency} is now available in your account.`,
        href: "/dashboard/transactions",
      },
    });

    return updated;
  });
}

export async function rejectDeposit(input: {
  requestId: string;
  reviewerId: string;
  notes?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.depositRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!request) throw new OperationError("Deposit request not found.", "not_found");
    if (request.status === RequestStatus.APPROVED) {
      throw new OperationError(
        "This deposit is already approved — reverse the journal entry instead.",
        "already_approved",
      );
    }

    const updated = await tx.depositRequest.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.REJECTED,
        reviewerId: input.reviewerId,
        reviewNotes: input.notes || null,
        reviewedAt: new Date(),
      },
    });

    await tx.transaction.updateMany({
      where: { reference: request.reference, userId: request.userId },
      data: { status: "FAILED", description: "Deposit declined" },
    });

    await tx.notification.create({
      data: {
        userId: request.userId,
        type: "WARNING",
        title: "Deposit could not be confirmed",
        body: input.notes || "We could not match this payment. Contact support with your transfer receipt.",
        href: "/dashboard/deposit",
      },
    });

    return updated;
  });
}

// -----------------------------------------------------------------------------
// Withdrawals
// -----------------------------------------------------------------------------

export async function createWithdrawalRequest(input: {
  userId: string;
  amount: Prisma.Decimal;
  method: DepositMethod;
  destination: Prisma.InputJsonValue;
}) {
  if (input.amount.lt(MIN_WITHDRAWAL)) {
    throw new OperationError(
      `The minimum withdrawal is ${MIN_WITHDRAWAL.toFixed(0)} USD.`,
      "below_minimum",
    );
  }

  return prisma.$transaction(async (tx) => {
    const available = await getAvailableCash(input.userId, tx);

    if (available.lt(input.amount)) {
      throw new OperationError(
        `Insufficient available cash. You can withdraw up to ${available.toFixed(2)} USD.`,
        "insufficient_funds",
      );
    }

    const fee = withdrawalFee(input.amount);
    const net = input.amount.sub(fee);

    const request = await tx.withdrawalRequest.create({
      data: {
        reference: generateReference("WDR"),
        userId: input.userId,
        amount: input.amount,
        feeAmount: fee,
        netAmount: net,
        method: input.method,
        destination: input.destination,
        status: RequestStatus.PENDING,
      },
    });

    await tx.transaction.create({
      data: {
        userId: input.userId,
        type: TransactionType.WITHDRAWAL,
        status: "PENDING",
        amount: input.amount.negated(),
        description: `Withdrawal via ${humanMethod(input.method)} — under review`,
        reference: request.reference,
      },
    });

    return request;
  });
}

export async function approveWithdrawal(input: {
  requestId: string;
  reviewerId: string;
  notes?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.withdrawalRequest.findUnique({
      where: { id: input.requestId },
    });

    if (!request) throw new OperationError("Withdrawal request not found.", "not_found");
    if (request.status === RequestStatus.APPROVED) {
      throw new OperationError("This withdrawal is already approved.", "already_approved");
    }
    if (request.status === RequestStatus.REJECTED || request.status === RequestStatus.CANCELLED) {
      throw new OperationError("This withdrawal was already closed.", "closed");
    }

    // Re-check at approval time: the balance may have moved since the request.
    const cashAccount = await tx.ledgerAccount.findUnique({
      where: { code: userAccountCode(request.userId, "cash") },
      select: { balance: true },
    });
    const balance = cashAccount?.balance ?? new Prisma.Decimal(0);

    if (balance.lt(request.amount)) {
      throw new OperationError(
        `The investor's cash balance (${balance.toFixed(2)}) no longer covers this withdrawal.`,
        "insufficient_funds",
      );
    }

    const lines = [
      {
        accountCode: userAccountCode(request.userId, "cash"),
        direction: LedgerDirection.DEBIT,
        amount: request.amount,
        memo: `Withdrawal ${request.reference}`,
      },
      {
        accountCode: settlementAccount(request.method),
        direction: LedgerDirection.CREDIT,
        amount: request.netAmount,
        memo: `Paid out — ${request.reference}`,
      },
    ];

    if (request.feeAmount.gt(0)) {
      lines.push({
        accountCode: SYSTEM_ACCOUNTS.FEES_WITHDRAWAL.code,
        direction: LedgerDirection.CREDIT,
        amount: request.feeAmount,
        memo: `Withdrawal fee — ${request.reference}`,
      });
    }

    const { entryId } = await postEntry(tx, {
      type: EntryType.WITHDRAWAL,
      description: `Withdrawal ${request.reference} approved`,
      currency: request.currency,
      createdById: input.reviewerId,
      metadata: { withdrawalId: request.id, method: request.method },
      lines,
    });

    const after = await tx.ledgerAccount.findUnique({
      where: { code: userAccountCode(request.userId, "cash") },
      select: { balance: true },
    });

    const updated = await tx.withdrawalRequest.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.APPROVED,
        reviewerId: input.reviewerId,
        reviewNotes: input.notes || null,
        reviewedAt: new Date(),
        settledAt: new Date(),
        journalEntryId: entryId,
      },
    });

    await tx.transaction.updateMany({
      where: { reference: request.reference, userId: request.userId },
      data: {
        status: "COMPLETED",
        description: `Withdrawal via ${humanMethod(request.method)}`,
        balanceAfter: after?.balance,
        journalEntryId: entryId,
      },
    });

    await tx.notification.create({
      data: {
        userId: request.userId,
        type: "SUCCESS",
        title: "Withdrawal sent",
        body: `${request.netAmount.toFixed(2)} ${request.currency} is on its way. Settlement takes 1–3 business days.`,
        href: "/dashboard/transactions",
      },
    });

    return updated;
  });
}

export async function rejectWithdrawal(input: {
  requestId: string;
  reviewerId: string;
  notes?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.withdrawalRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!request) throw new OperationError("Withdrawal request not found.", "not_found");
    if (request.status === RequestStatus.APPROVED) {
      throw new OperationError(
        "This withdrawal is already approved — reverse the journal entry instead.",
        "already_approved",
      );
    }

    const updated = await tx.withdrawalRequest.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.REJECTED,
        reviewerId: input.reviewerId,
        reviewNotes: input.notes || null,
        reviewedAt: new Date(),
      },
    });

    // No ledger entry was ever posted, so releasing the hold is just a status
    // change — the funds were never debited.
    await tx.transaction.updateMany({
      where: { reference: request.reference, userId: request.userId },
      data: { status: "FAILED", description: "Withdrawal declined" },
    });

    await tx.notification.create({
      data: {
        userId: request.userId,
        type: "WARNING",
        title: "Withdrawal declined",
        body: input.notes || "Your withdrawal request was declined. Contact support for details.",
        href: "/dashboard/withdraw",
      },
    });

    return updated;
  });
}

// -----------------------------------------------------------------------------
// Investments
// -----------------------------------------------------------------------------

export async function openInvestment(input: {
  userId: string;
  planId: string;
  amount: Prisma.Decimal;
  autoRenew?: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.investmentPlan.findUnique({ where: { id: input.planId } });
    if (!plan || !plan.isActive) {
      throw new OperationError("That plan is not available.", "plan_unavailable");
    }
    if (input.amount.lt(plan.minimumAmount)) {
      throw new OperationError(
        `${plan.name} has a minimum of ${plan.minimumAmount.toFixed(0)} USD.`,
        "below_minimum",
      );
    }
    if (plan.maximumAmount && input.amount.gt(plan.maximumAmount)) {
      throw new OperationError(
        `${plan.name} caps single allocations at ${plan.maximumAmount.toFixed(0)} USD.`,
        "above_maximum",
      );
    }

    const available = await getAvailableCash(input.userId, tx);
    if (available.lt(input.amount)) {
      throw new OperationError(
        `Insufficient cash. Available: ${available.toFixed(2)} USD.`,
        "insufficient_funds",
      );
    }

    const reference = generateReference("INV");
    const maturesAt =
      plan.lockupDays > 0
        ? new Date(Date.now() + plan.lockupDays * 86_400_000)
        : null;

    const { entryId } = await postEntry(tx, {
      type: EntryType.INVESTMENT_OPEN,
      description: `Allocation to ${plan.name} — ${reference}`,
      createdById: input.userId,
      metadata: { planId: plan.id, planSlug: plan.slug },
      lines: [
        {
          accountCode: userAccountCode(input.userId, "cash"),
          direction: LedgerDirection.DEBIT,
          amount: input.amount,
          memo: `Allocated to ${plan.name}`,
        },
        {
          accountCode: userAccountCode(input.userId, "invested"),
          direction: LedgerDirection.CREDIT,
          amount: input.amount,
          memo: `${plan.name} — ${reference}`,
        },
      ],
    });

    const investment = await tx.investment.create({
      data: {
        reference,
        userId: input.userId,
        planId: plan.id,
        principal: input.amount,
        currentValue: input.amount,
        status: InvestmentStatus.ACTIVE,
        startedAt: new Date(),
        maturesAt,
        autoRenew: input.autoRenew ?? false,
      },
    });

    await tx.transaction.create({
      data: {
        userId: input.userId,
        type: TransactionType.INVESTMENT,
        status: "COMPLETED",
        amount: input.amount.negated(),
        description: `Allocated to ${plan.name}`,
        reference,
        journalEntryId: entryId,
      },
    });

    await tx.notification.create({
      data: {
        userId: input.userId,
        type: "SUCCESS",
        title: `${plan.name} position opened`,
        body: `${input.amount.toFixed(2)} USD allocated${maturesAt ? `, unlocking ${maturesAt.toDateString()}` : ""}.`,
        href: "/dashboard/investments",
      },
    });

    return investment;
  });
}

/**
 * Credits (or debits) a return period against an open position.
 * A positive amount asserts the underlying assets appreciated: the custody
 * account is debited and the investor's claim is credited.
 */
export async function accrueReturn(input: {
  investmentId: string;
  amount: Prisma.Decimal;
  ratePct: Prisma.Decimal;
  periodStart: Date;
  periodEnd: Date;
  note?: string | null;
  actorId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const investment = await tx.investment.findUnique({
      where: { id: input.investmentId },
      include: { plan: { select: { name: true } } },
    });

    if (!investment) throw new OperationError("Investment not found.", "not_found");
    if (investment.status !== InvestmentStatus.ACTIVE) {
      throw new OperationError("Only active positions can accrue.", "not_active");
    }

    const isGain = input.amount.gt(0);
    const magnitude = input.amount.abs();

    if (!isGain && investment.currentValue.lt(magnitude)) {
      throw new OperationError(
        "A loss cannot exceed the position value.",
        "loss_exceeds_position",
      );
    }

    const { entryId } = await postEntry(tx, {
      type: EntryType.RETURN_ACCRUAL,
      description: `${isGain ? "Return" : "Loss"} on ${investment.reference} (${investment.plan.name})`,
      createdById: input.actorId,
      metadata: {
        investmentId: investment.id,
        ratePct: input.ratePct.toString(),
        periodStart: input.periodStart.toISOString(),
        periodEnd: input.periodEnd.toISOString(),
      },
      lines: isGain
        ? [
            {
              accountCode: SYSTEM_ACCOUNTS.CUSTODY_CRYPTO.code,
              direction: LedgerDirection.DEBIT,
              amount: magnitude,
              memo: "Portfolio appreciation",
            },
            {
              accountCode: userAccountCode(investment.userId, "invested"),
              direction: LedgerDirection.CREDIT,
              amount: magnitude,
              memo: `Return credited — ${investment.reference}`,
            },
          ]
        : [
            {
              accountCode: userAccountCode(investment.userId, "invested"),
              direction: LedgerDirection.DEBIT,
              amount: magnitude,
              memo: `Loss applied — ${investment.reference}`,
            },
            {
              accountCode: SYSTEM_ACCOUNTS.CUSTODY_CRYPTO.code,
              direction: LedgerDirection.CREDIT,
              amount: magnitude,
              memo: "Portfolio depreciation",
            },
          ],
    });

    await tx.accrualEntry.create({
      data: {
        investmentId: investment.id,
        amount: input.amount,
        ratePct: input.ratePct,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        note: input.note || null,
        createdById: input.actorId,
      },
    });

    const updated = await tx.investment.update({
      where: { id: investment.id },
      data: {
        currentValue: { increment: input.amount },
        realisedPnl: { increment: input.amount },
        lastAccrualAt: input.periodEnd,
      },
    });

    await tx.transaction.create({
      data: {
        userId: investment.userId,
        type: TransactionType.RETURN,
        status: "COMPLETED",
        amount: input.amount,
        description: `${isGain ? "Return" : "Loss"} — ${investment.plan.name}`,
        reference: investment.reference,
        journalEntryId: entryId,
      },
    });

    await tx.notification.create({
      data: {
        userId: investment.userId,
        type: isGain ? "SUCCESS" : "WARNING",
        title: isGain ? "Return credited" : "Position marked down",
        body: `${investment.plan.name}: ${isGain ? "+" : "−"}${magnitude.toFixed(2)} USD for the period ending ${input.periodEnd.toDateString()}.`,
        href: "/dashboard/investments",
      },
    });

    return updated;
  });
}

/**
 * Closes a position: fees are taken out of the proceeds, the remainder returns
 * to the investor's cash balance.
 */
export async function closeInvestment(input: {
  investmentId: string;
  actorId: string;
  /** Waives the early-exit fee — used when an admin closes a plan early. */
  waiveEarlyExitFee?: boolean;
  note?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const investment = await tx.investment.findUnique({
      where: { id: input.investmentId },
      include: { plan: true },
    });

    if (!investment) throw new OperationError("Investment not found.", "not_found");
    if (investment.status !== InvestmentStatus.ACTIVE && investment.status !== InvestmentStatus.MATURED) {
      throw new OperationError("This position is already closed.", "already_closed");
    }

    const gross = investment.currentValue;
    const profit = gross.sub(investment.principal);

    const performanceFee = profit.gt(0)
      ? roundCents(profit.mul(investment.plan.performanceFeePct).div(100))
      : new Prisma.Decimal(0);

    const isEarly =
      investment.maturesAt !== null && investment.maturesAt.getTime() > Date.now();

    const earlyExitFee =
      isEarly && !input.waiveEarlyExitFee
        ? roundCents(gross.mul(investment.plan.earlyExitFeePct).div(100))
        : new Prisma.Decimal(0);

    const totalFees = performanceFee.add(earlyExitFee);
    const net = gross.sub(totalFees);

    if (net.lte(0)) {
      throw new OperationError(
        "Fees would consume the entire position — review the plan configuration.",
        "fees_exceed_value",
      );
    }

    const lines = [
      {
        accountCode: userAccountCode(investment.userId, "invested"),
        direction: LedgerDirection.DEBIT,
        amount: gross,
        memo: `Position closed — ${investment.reference}`,
      },
      {
        accountCode: userAccountCode(investment.userId, "cash"),
        direction: LedgerDirection.CREDIT,
        amount: net,
        memo: `Proceeds — ${investment.reference}`,
      },
    ];

    if (performanceFee.gt(0)) {
      lines.push({
        accountCode: SYSTEM_ACCOUNTS.FEES_PERFORMANCE.code,
        direction: LedgerDirection.CREDIT,
        amount: performanceFee,
        memo: `Performance fee ${investment.plan.performanceFeePct.toString()}% on profit`,
      });
    }
    if (earlyExitFee.gt(0)) {
      lines.push({
        accountCode: SYSTEM_ACCOUNTS.FEES_MANAGEMENT.code,
        direction: LedgerDirection.CREDIT,
        amount: earlyExitFee,
        memo: `Early exit fee ${investment.plan.earlyExitFeePct.toString()}%`,
      });
    }

    const { entryId } = await postEntry(tx, {
      type: EntryType.INVESTMENT_CLOSE,
      description: `Closed ${investment.reference} (${investment.plan.name})`,
      createdById: input.actorId,
      metadata: {
        investmentId: investment.id,
        gross: gross.toString(),
        performanceFee: performanceFee.toString(),
        earlyExitFee: earlyExitFee.toString(),
      },
      lines,
    });

    const cash = await tx.ledgerAccount.findUnique({
      where: { code: userAccountCode(investment.userId, "cash") },
      select: { balance: true },
    });

    const updated = await tx.investment.update({
      where: { id: investment.id },
      data: {
        status: InvestmentStatus.CLOSED,
        closedAt: new Date(),
        feesPaid: { increment: totalFees },
        currentValue: new Prisma.Decimal(0),
        note: input.note || investment.note,
      },
    });

    await tx.transaction.create({
      data: {
        userId: investment.userId,
        type: TransactionType.INVESTMENT_CLOSE,
        status: "COMPLETED",
        amount: net,
        description: `Closed ${investment.plan.name}${totalFees.gt(0) ? ` (fees ${totalFees.toFixed(2)})` : ""}`,
        reference: investment.reference,
        balanceAfter: cash?.balance,
        journalEntryId: entryId,
      },
    });

    await tx.notification.create({
      data: {
        userId: investment.userId,
        type: "INFO",
        title: `${investment.plan.name} position closed`,
        body: `${net.toFixed(2)} USD returned to your cash balance.`,
        href: "/dashboard/transactions",
      },
    });

    return { investment: updated, net, totalFees, profit };
  });
}

// -----------------------------------------------------------------------------
// Manual adjustment
// -----------------------------------------------------------------------------

/**
 * Escape hatch for corrections, goodwill credits and reconciliations. Always
 * requires a written reason and always lands in the audit log.
 */
export async function adjustUserCash(input: {
  userId: string;
  amount: Prisma.Decimal;
  direction: "CREDIT" | "DEBIT";
  reason: string;
  actorId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await ensureUserAccounts(tx, input.userId);

    if (input.direction === "DEBIT") {
      const account = await tx.ledgerAccount.findUnique({
        where: { code: userAccountCode(input.userId, "cash") },
        select: { balance: true },
      });
      const balance = account?.balance ?? new Prisma.Decimal(0);
      if (balance.lt(input.amount)) {
        throw new OperationError(
          `Cannot debit ${input.amount.toFixed(2)} — the balance is ${balance.toFixed(2)}.`,
          "insufficient_funds",
        );
      }
    }

    const isCredit = input.direction === "CREDIT";

    const { entryId, reference } = await postEntry(tx, {
      type: EntryType.MANUAL_ADJUSTMENT,
      description: `Manual adjustment: ${input.reason}`,
      createdById: input.actorId,
      metadata: { reason: input.reason, direction: input.direction },
      lines: isCredit
        ? [
            {
              accountCode: SYSTEM_ACCOUNTS.ADJUSTMENTS.code,
              direction: LedgerDirection.DEBIT,
              amount: input.amount,
              memo: input.reason,
            },
            {
              accountCode: userAccountCode(input.userId, "cash"),
              direction: LedgerDirection.CREDIT,
              amount: input.amount,
              memo: input.reason,
            },
          ]
        : [
            {
              accountCode: userAccountCode(input.userId, "cash"),
              direction: LedgerDirection.DEBIT,
              amount: input.amount,
              memo: input.reason,
            },
            {
              accountCode: SYSTEM_ACCOUNTS.ADJUSTMENTS.code,
              direction: LedgerDirection.CREDIT,
              amount: input.amount,
              memo: input.reason,
            },
          ],
    });

    const cash = await tx.ledgerAccount.findUnique({
      where: { code: userAccountCode(input.userId, "cash") },
      select: { balance: true },
    });

    await tx.transaction.create({
      data: {
        userId: input.userId,
        type: TransactionType.ADJUSTMENT,
        status: "COMPLETED",
        amount: isCredit ? input.amount : input.amount.negated(),
        description: input.reason,
        reference,
        balanceAfter: cash?.balance,
        journalEntryId: entryId,
      },
    });

    await tx.notification.create({
      data: {
        userId: input.userId,
        type: "INFO",
        title: isCredit ? "Account credited" : "Account adjusted",
        body: `${input.amount.toFixed(2)} USD — ${input.reason}`,
        href: "/dashboard/transactions",
      },
    });

    return { entryId, reference, balance: cash?.balance };
  });
}

// -----------------------------------------------------------------------------
// Presentation helpers
// -----------------------------------------------------------------------------

export function humanMethod(method: DepositMethod): string {
  const labels: Record<DepositMethod, string> = {
    BANK_TRANSFER: "bank transfer",
    BTC: "Bitcoin",
    ETH: "Ethereum",
    USDT_TRC20: "USDT (TRC-20)",
    USDT_ERC20: "USDT (ERC-20)",
    CARD: "card",
  };
  return labels[method];
}

export function methodLabel(method: DepositMethod): string {
  const label = humanMethod(method);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Rolls a user's positions up into the numbers the dashboard header shows. */
export async function getPortfolioSummary(userId: string) {
  const [balances, investments, deposits, returns] = await Promise.all([
    prisma.ledgerAccount.findMany({
      where: { userId },
      select: { code: true, balance: true },
    }),
    prisma.investment.findMany({
      where: { userId, status: { in: [InvestmentStatus.ACTIVE, InvestmentStatus.MATURED] } },
      include: { plan: { select: { name: true, slug: true, riskLevel: true, allocation: true } } },
      orderBy: { startedAt: "desc" },
    }),
    prisma.depositRequest.aggregate({
      where: { userId, status: RequestStatus.APPROVED },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: TransactionType.RETURN, status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  const zero = new Prisma.Decimal(0);
  const cash =
    balances.find((b) => b.code === userAccountCode(userId, "cash"))?.balance ?? zero;
  const invested =
    balances.find((b) => b.code === userAccountCode(userId, "invested"))?.balance ?? zero;

  const principal = investments.reduce(
    (sum, inv) => sum.add(inv.principal),
    new Prisma.Decimal(0),
  );

  const totalReturns = returns._sum.amount ?? zero;
  const totalDeposited = deposits._sum.amount ?? zero;
  const totalValue = cash.add(invested);

  const roiPct = totalDeposited.gt(0)
    ? totalValue.sub(totalDeposited).div(totalDeposited).mul(100)
    : zero;

  return {
    cash,
    invested,
    totalValue,
    principal,
    totalReturns,
    totalDeposited,
    roiPct,
    investments,
    openPositions: investments.length,
  };
}

export { dec };
