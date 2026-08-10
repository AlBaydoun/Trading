/**
 * End-to-end exercise of the money operations against the seeded database.
 * Approves the pending deposit and withdrawal, opens/accrues/closes a position,
 * and asserts the ledger reconciles after every step.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { verifyLedgerIntegrity } from "../src/lib/ledger";
import {
  approveDeposit,
  approveWithdrawal,
  openInvestment,
  accrueReturn,
  closeInvestment,
  adjustUserCash,
  getAvailableCash,
} from "../src/lib/operations/money";

const prisma = new PrismaClient();
let failures = 0;

async function step(name: string, fn: () => Promise<string>) {
  try {
    const detail = await fn();
    const integrity = await verifyLedgerIntegrity();
    const mark = integrity.balanced ? "PASS" : "LEDGER OUT OF BALANCE";
    if (!integrity.balanced) failures += 1;
    console.log(`  ${mark.padEnd(22)} ${name} — ${detail}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL                   ${name} — ${(error as Error).message}`);
  }
}

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@axiomcapital.example" },
  });

  const before = await verifyLedgerIntegrity();
  console.log(`\n  Baseline: ${before.balanced ? "balanced" : "OUT OF BALANCE"} (${before.entryCount} entries)\n`);
  if (!before.balanced) failures += 1;

  const deposit = await prisma.depositRequest.findFirst({ where: { status: "PENDING" } });
  if (deposit) {
    await step("approve pending deposit", async () => {
      const r = await approveDeposit({ requestId: deposit.id, reviewerId: admin.id, notes: "smoke test" });
      return `${r.reference} → ${r.status}`;
    });
    await step("re-approving the same deposit is rejected", async () => {
      try {
        await approveDeposit({ requestId: deposit.id, reviewerId: admin.id });
        throw new Error("double approval was allowed");
      } catch (e) {
        const msg = (e as Error).message;
        if (msg === "double approval was allowed") throw e;
        return `blocked: ${msg}`;
      }
    });
  }

  const withdrawal = await prisma.withdrawalRequest.findFirst({ where: { status: "PENDING" } });
  if (withdrawal) {
    await step("approve pending withdrawal", async () => {
      const r = await approveWithdrawal({ requestId: withdrawal.id, reviewerId: admin.id });
      return `${r.reference} net ${r.netAmount.toFixed(2)} fee ${r.feeAmount.toFixed(2)}`;
    });
  }

  const investor = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@axiomcapital.example" },
  });
  const plan = await prisma.investmentPlan.findFirstOrThrow({ where: { slug: "stable-yield" } });

  await step("credit the investor so there is cash to allocate", async () => {
    const r = await adjustUserCash({
      userId: investor.id,
      amount: new Prisma.Decimal("5000"),
      direction: "CREDIT",
      reason: "smoke test funding",
      actorId: admin.id,
    });
    return `${r.reference} balance ${r.balance?.toFixed(2)}`;
  });

  let investmentId = "";
  await step("open a position", async () => {
    const inv = await openInvestment({
      userId: investor.id,
      planId: plan.id,
      amount: new Prisma.Decimal("2000"),
    });
    investmentId = inv.id;
    return `${inv.reference} principal ${inv.principal.toFixed(2)}`;
  });

  await step("over-allocating is rejected", async () => {
    const available = await getAvailableCash(investor.id);
    try {
      await openInvestment({
        userId: investor.id,
        planId: plan.id,
        amount: available.add(1_000_000),
      });
      throw new Error("over-allocation was allowed");
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "over-allocation was allowed") throw e;
      return `blocked: ${msg}`;
    }
  });

  await step("accrue a positive return", async () => {
    const updated = await accrueReturn({
      investmentId,
      amount: new Prisma.Decimal("24.50"),
      ratePct: new Prisma.Decimal("1.225"),
      periodStart: new Date(Date.now() - 30 * 86_400_000),
      periodEnd: new Date(),
      actorId: admin.id,
    });
    return `value now ${updated.currentValue.toFixed(2)}`;
  });

  await step("accrue a loss", async () => {
    const updated = await accrueReturn({
      investmentId,
      amount: new Prisma.Decimal("-8.10"),
      ratePct: new Prisma.Decimal("-0.4"),
      periodStart: new Date(Date.now() - 86_400_000),
      periodEnd: new Date(),
      actorId: admin.id,
    });
    return `value now ${updated.currentValue.toFixed(2)}`;
  });

  await step("close the position", async () => {
    const r = await closeInvestment({ investmentId, actorId: admin.id });
    return `net ${r.net.toFixed(2)} fees ${r.totalFees.toFixed(2)} profit ${r.profit.toFixed(2)}`;
  });

  await step("debiting more than the balance is rejected", async () => {
    try {
      await adjustUserCash({
        userId: investor.id,
        amount: new Prisma.Decimal("99999999"),
        direction: "DEBIT",
        reason: "smoke test overdraw",
        actorId: admin.id,
      });
      throw new Error("overdraw was allowed");
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "overdraw was allowed") throw e;
      return `blocked: ${msg}`;
    }
  });

  const after = await verifyLedgerIntegrity();
  console.log(
    `\n  Final: ${after.balanced ? "BALANCED" : `OUT OF BALANCE (${after.signedSum})`} — ${after.entryCount} entries, ${after.lineCount} lines\n`,
  );
  if (!after.balanced) failures += 1;

  if (failures > 0) {
    console.error(`  ${failures} check(s) failed.\n`);
    process.exitCode = 1;
  } else {
    console.log("  All checks passed.\n");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
