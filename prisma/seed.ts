/**
 * Seeds a working platform: system ledger accounts, investment plans, market
 * assets, editorial content, staff and a set of demo investors with a coherent
 * transaction history.
 *
 * Idempotent — safe to re-run. Existing rows are updated rather than duplicated.
 *
 *   npm run db:seed
 */

import {
  AssetKind,
  EntryType,
  InvestmentStatus,
  LedgerDirection,
  PrismaClient,
  Prisma,
  RequestStatus,
  TransactionType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  SYSTEM_ACCOUNTS,
  ensureSystemAccounts,
  ensureUserAccounts,
  postEntry,
  userAccountCode,
  verifyLedgerIntegrity,
} from "../src/lib/ledger";
import { PLAN_SEEDS } from "./seed-data/plans";
import { ASSET_SEEDS, buildSparkline } from "./seed-data/assets";
import { POST_SEEDS } from "./seed-data/posts";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo!2024Investor";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@axiomcapital.example";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2024";

/** Deterministic RNG so every seed run produces the same demo history. */
let rngState = 20260810;
function rand(): number {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
function randBetween(min: number, max: number): number {
  return min + rand() * (max - min);
}
function pick<T>(items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}
function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

function reference(prefix: string, n: number): string {
  return `${prefix}-SEED${String(n).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Ledger helpers — these post backdated entries, which the runtime operations
// layer deliberately does not allow.
// ---------------------------------------------------------------------------

let entryCounter = 0;

async function seedDeposit(userId: string, amount: number, when: Date) {
  entryCounter += 1;
  const ref = reference("DEP", entryCounter);
  const value = money(amount);

  await prisma.$transaction(async (tx) => {
    const { entryId } = await postEntry(tx, {
      type: EntryType.DEPOSIT,
      description: `Deposit ${ref} approved`,
      reference: reference("JE", entryCounter),
      occurredAt: when,
      lines: [
        {
          accountCode: SYSTEM_ACCOUNTS.BANK_FIAT.code,
          direction: LedgerDirection.DEBIT,
          amount: value,
          memo: `Funds received — ${ref}`,
        },
        {
          accountCode: userAccountCode(userId, "cash"),
          direction: LedgerDirection.CREDIT,
          amount: value,
          memo: `Deposit credited — ${ref}`,
        },
      ],
    });

    const request = await tx.depositRequest.create({
      data: {
        reference: ref,
        userId,
        amount: value,
        method: "BANK_TRANSFER",
        status: RequestStatus.APPROVED,
        createdAt: when,
        reviewedAt: when,
        journalEntryId: entryId,
      },
    });

    const cash = await tx.ledgerAccount.findUnique({
      where: { code: userAccountCode(userId, "cash") },
      select: { balance: true },
    });

    await tx.transaction.create({
      data: {
        userId,
        type: TransactionType.DEPOSIT,
        status: "COMPLETED",
        amount: value,
        description: "Deposit via bank transfer",
        reference: request.reference,
        balanceAfter: cash?.balance,
        journalEntryId: entryId,
        createdAt: when,
      },
    });
  });
}

async function seedInvestment(
  userId: string,
  planId: string,
  planName: string,
  amount: number,
  when: Date,
  lockupDays: number,
) {
  entryCounter += 1;
  const ref = reference("INV", entryCounter);
  const value = money(amount);

  return prisma.$transaction(async (tx) => {
    const { entryId } = await postEntry(tx, {
      type: EntryType.INVESTMENT_OPEN,
      description: `Allocation to ${planName} — ${ref}`,
      reference: reference("JE", entryCounter),
      occurredAt: when,
      lines: [
        {
          accountCode: userAccountCode(userId, "cash"),
          direction: LedgerDirection.DEBIT,
          amount: value,
          memo: `Allocated to ${planName}`,
        },
        {
          accountCode: userAccountCode(userId, "invested"),
          direction: LedgerDirection.CREDIT,
          amount: value,
          memo: `${planName} — ${ref}`,
        },
      ],
    });

    const investment = await tx.investment.create({
      data: {
        reference: ref,
        userId,
        planId,
        principal: value,
        currentValue: value,
        status: InvestmentStatus.ACTIVE,
        startedAt: when,
        createdAt: when,
        maturesAt:
          lockupDays > 0
            ? new Date(when.getTime() + lockupDays * 86_400_000)
            : null,
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        type: TransactionType.INVESTMENT,
        status: "COMPLETED",
        amount: value.negated(),
        description: `Allocated to ${planName}`,
        reference: ref,
        journalEntryId: entryId,
        createdAt: when,
      },
    });

    return investment;
  });
}

async function seedAccrual(
  investmentId: string,
  userId: string,
  planName: string,
  amount: number,
  ratePct: number,
  periodStart: Date,
  periodEnd: Date,
) {
  entryCounter += 1;
  const value = money(Math.abs(amount));
  const isGain = amount > 0;

  await prisma.$transaction(async (tx) => {
    const { entryId } = await postEntry(tx, {
      type: EntryType.RETURN_ACCRUAL,
      description: `${isGain ? "Return" : "Loss"} on ${planName}`,
      reference: reference("JE", entryCounter),
      occurredAt: periodEnd,
      lines: isGain
        ? [
            {
              accountCode: SYSTEM_ACCOUNTS.CUSTODY_CRYPTO.code,
              direction: LedgerDirection.DEBIT,
              amount: value,
              memo: "Portfolio appreciation",
            },
            {
              accountCode: userAccountCode(userId, "invested"),
              direction: LedgerDirection.CREDIT,
              amount: value,
              memo: "Return credited",
            },
          ]
        : [
            {
              accountCode: userAccountCode(userId, "invested"),
              direction: LedgerDirection.DEBIT,
              amount: value,
              memo: "Loss applied",
            },
            {
              accountCode: SYSTEM_ACCOUNTS.CUSTODY_CRYPTO.code,
              direction: LedgerDirection.CREDIT,
              amount: value,
              memo: "Portfolio depreciation",
            },
          ],
    });

    await tx.accrualEntry.create({
      data: {
        investmentId,
        amount: isGain ? value : value.negated(),
        ratePct: new Prisma.Decimal(ratePct.toFixed(4)),
        periodStart,
        periodEnd,
        createdAt: periodEnd,
      },
    });

    await tx.investment.update({
      where: { id: investmentId },
      data: {
        currentValue: { increment: isGain ? value : value.negated() },
        realisedPnl: { increment: isGain ? value : value.negated() },
        lastAccrualAt: periodEnd,
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        type: TransactionType.RETURN,
        status: "COMPLETED",
        amount: isGain ? value : value.negated(),
        description: `${isGain ? "Return" : "Loss"} — ${planName}`,
        reference: reference("ACC", entryCounter),
        journalEntryId: entryId,
        createdAt: periodEnd,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function seedPlans() {
  for (const plan of PLAN_SEEDS) {
    await prisma.investmentPlan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        tagline: plan.tagline,
        description: plan.description,
        minimumAmount: new Prisma.Decimal(plan.minimumAmount),
        maximumAmount: plan.maximumAmount
          ? new Prisma.Decimal(plan.maximumAmount)
          : null,
        targetApyLow: new Prisma.Decimal(plan.targetApyLow),
        targetApyHigh: new Prisma.Decimal(plan.targetApyHigh),
        managementFeePct: new Prisma.Decimal(plan.managementFeePct),
        performanceFeePct: new Prisma.Decimal(plan.performanceFeePct),
        earlyExitFeePct: new Prisma.Decimal(plan.earlyExitFeePct),
        lockupDays: plan.lockupDays,
        payoutFrequency: plan.payoutFrequency,
        riskLevel: plan.riskLevel,
        allocation: plan.allocation,
        highlights: plan.highlights,
        isFeatured: plan.isFeatured,
        sortOrder: plan.sortOrder,
        isActive: true,
      },
      create: {
        slug: plan.slug,
        name: plan.name,
        tagline: plan.tagline,
        description: plan.description,
        minimumAmount: new Prisma.Decimal(plan.minimumAmount),
        maximumAmount: plan.maximumAmount
          ? new Prisma.Decimal(plan.maximumAmount)
          : null,
        targetApyLow: new Prisma.Decimal(plan.targetApyLow),
        targetApyHigh: new Prisma.Decimal(plan.targetApyHigh),
        managementFeePct: new Prisma.Decimal(plan.managementFeePct),
        performanceFeePct: new Prisma.Decimal(plan.performanceFeePct),
        earlyExitFeePct: new Prisma.Decimal(plan.earlyExitFeePct),
        lockupDays: plan.lockupDays,
        payoutFrequency: plan.payoutFrequency,
        riskLevel: plan.riskLevel,
        allocation: plan.allocation,
        highlights: plan.highlights,
        isFeatured: plan.isFeatured,
        sortOrder: plan.sortOrder,
      },
    });
  }
  console.log(`  ✓ ${PLAN_SEEDS.length} investment plans`);
}

async function seedAssets() {
  for (const [index, asset] of ASSET_SEEDS.entries()) {
    const data = {
      name: asset.name,
      kind: asset.kind as AssetKind,
      priceUsd: new Prisma.Decimal(asset.price.toFixed(8)),
      change24hPct: new Prisma.Decimal(asset.change24h.toFixed(4)),
      change7dPct: new Prisma.Decimal(asset.change7d.toFixed(4)),
      marketCapUsd: asset.marketCap
        ? new Prisma.Decimal(asset.marketCap.toFixed(2))
        : null,
      volume24hUsd: asset.volume24h
        ? new Prisma.Decimal(asset.volume24h.toFixed(2))
        : null,
      exchange: asset.exchange ?? null,
      coingeckoId: asset.coingeckoId ?? null,
      rank: asset.rank ?? null,
      isFeatured: asset.featured ?? false,
      sparkline: buildSparkline(asset.price, asset.change7d, index + 7),
    };

    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: data,
      create: { symbol: asset.symbol, ...data },
    });
  }
  console.log(`  ✓ ${ASSET_SEEDS.length} market assets`);
}

async function seedPosts() {
  for (const post of POST_SEEDS) {
    const publishedAt = daysAgo(post.daysAgo);
    const readingMinutes = Math.max(
      2,
      Math.round(post.content.split(/\s+/).length / 220),
    );

    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        tags: post.tags,
        authorName: post.authorName,
        authorRole: post.authorRole,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        readingMinutes,
        published: true,
        publishedAt,
      },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        tags: post.tags,
        authorName: post.authorName,
        authorRole: post.authorRole,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        readingMinutes,
        published: true,
        publishedAt,
        views: Math.floor(randBetween(120, 4200)),
      },
    });
  }
  console.log(`  ✓ ${POST_SEEDS.length} published articles`);
}

interface StaffSeed {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "ANALYST" | "ADMIN" | "SUPER_ADMIN";
}

async function seedStaff() {
  const staff: StaffSeed[] = [
    {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      firstName: "Platform",
      lastName: "Owner",
      role: "SUPER_ADMIN",
    },
    {
      email: "ops@axiomcapital.example",
      password: DEMO_PASSWORD,
      firstName: "Omar",
      lastName: "Haddad",
      role: "ADMIN",
    },
    {
      email: "analyst@axiomcapital.example",
      password: DEMO_PASSWORD,
      firstName: "Sofia",
      lastName: "Lindqvist",
      role: "ANALYST",
    },
  ];

  for (const [index, member] of staff.entries()) {
    const user = await prisma.user.upsert({
      where: { email: member.email },
      update: { role: member.role, status: "ACTIVE", kycStatus: "APPROVED" },
      create: {
        email: member.email,
        passwordHash: await bcrypt.hash(member.password, 10),
        firstName: member.firstName,
        lastName: member.lastName,
        role: member.role,
        status: "ACTIVE",
        kycStatus: "APPROVED",
        emailVerifiedAt: new Date(),
        referralCode: `AXSTAFF${index}`,
        country: "GB",
      },
    });
    await ensureUserAccounts(prisma, user.id);
  }

  console.log(`  ✓ ${staff.length} staff accounts`);
  return prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
}

const INVESTOR_SEEDS = [
  { first: "Layla", last: "Baydoun", country: "AE", kyc: "APPROVED" as const, capital: 48000 },
  { first: "James", last: "Okonkwo", country: "GB", kyc: "APPROVED" as const, capital: 125000 },
  { first: "Marta", last: "Kowalski", country: "PL", kyc: "APPROVED" as const, capital: 18500 },
  { first: "Chen", last: "Wei", country: "SG", kyc: "APPROVED" as const, capital: 260000 },
  { first: "Tomás", last: "Ferreira", country: "PT", kyc: "APPROVED" as const, capital: 9200 },
  { first: "Aisha", last: "Rahimi", country: "DE", kyc: "PENDING" as const, capital: 0 },
  { first: "Daniel", last: "Meyer", country: "CH", kyc: "APPROVED" as const, capital: 76000 },
  { first: "Priya", last: "Nair", country: "IN", kyc: "NOT_STARTED" as const, capital: 0 },
  { first: "Kofi", last: "Mensah", country: "GH", kyc: "REJECTED" as const, capital: 0 },
  { first: "Elena", last: "Volkova", country: "CY", kyc: "APPROVED" as const, capital: 34000 },
];

async function seedInvestors(plans: { id: string; name: string; slug: string; lockupDays: number; minimumAmount: Prisma.Decimal }[]) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // A flagship demo account with a full, believable history.
  const demo = await prisma.user.upsert({
    where: { email: "demo@axiomcapital.example" },
    update: { status: "ACTIVE", kycStatus: "APPROVED" },
    create: {
      email: "demo@axiomcapital.example",
      passwordHash,
      firstName: "Demo",
      lastName: "Investor",
      country: "AE",
      phone: "+971 50 000 0000",
      role: "USER",
      status: "ACTIVE",
      kycStatus: "APPROVED",
      riskProfile: "GROWTH",
      emailVerifiedAt: daysAgo(180),
      referralCode: "AXDEMO01",
      createdAt: daysAgo(182),
    },
  });

  const created: { id: string; capital: number }[] = [];

  for (const [index, seed] of INVESTOR_SEEDS.entries()) {
    const email = `${seed.first.toLowerCase()}.${seed.last.toLowerCase().replace(/[^a-z]/g, "")}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        firstName: seed.first,
        lastName: seed.last,
        country: seed.country,
        role: "USER",
        status: seed.last === "Mensah" ? "SUSPENDED" : "ACTIVE",
        kycStatus: seed.kyc,
        riskProfile: pick(["CONSERVATIVE", "BALANCED", "GROWTH", "AGGRESSIVE"] as const),
        emailVerifiedAt: seed.kyc === "NOT_STARTED" ? null : daysAgo(120 - index * 4),
        referralCode: `AX${seed.first.slice(0, 3).toUpperCase()}${index}${Math.floor(rand() * 900 + 100)}`,
        createdAt: daysAgo(150 - index * 8),
      },
    });

    await ensureUserAccounts(prisma, user.id);
    created.push({ id: user.id, capital: seed.capital });

    if (seed.kyc === "PENDING") {
      const existing = await prisma.kycSubmission.findFirst({ where: { userId: user.id } });
      if (!existing) {
        await prisma.kycSubmission.create({
          data: {
            userId: user.id,
            documentType: "PASSPORT",
            documentNumber: `P${Math.floor(rand() * 9_000_000 + 1_000_000)}`,
            dateOfBirth: new Date("1989-04-17"),
            nationality: seed.country,
            addressLine1: "12 Hauptstrasse",
            city: "Munich",
            postalCode: "80331",
            country: seed.country,
            sourceOfFunds: "EMPLOYMENT",
            documentFrontPath: "/uploads/demo/passport-front.jpg",
            selfiePath: "/uploads/demo/selfie.jpg",
            status: "PENDING",
            submittedAt: daysAgo(2),
          },
        });
      }
    }
  }

  await ensureUserAccounts(prisma, demo.id);
  created.unshift({ id: demo.id, capital: 87500 });

  console.log(`  ✓ ${created.length} investor accounts`);
  return { demo, investors: created };
}

async function seedActivity(
  investors: { id: string; capital: number }[],
  plans: { id: string; name: string; slug: string; lockupDays: number; minimumAmount: Prisma.Decimal }[],
) {
  // Only seed history once — re-running should not duplicate the ledger.
  const alreadySeeded = await prisma.journalEntry.count({
    where: { reference: { startsWith: "JE-SEED" } },
  });
  if (alreadySeeded > 0) {
    console.log("  · activity already seeded, skipping ledger history");
    return;
  }

  for (const investor of investors) {
    if (investor.capital <= 0) continue;

    // Fund the account across two or three tranches over the last six months.
    const tranches = Math.floor(randBetween(2, 4));
    let funded = 0;
    for (let i = 0; i < tranches; i += 1) {
      const share = i === tranches - 1 ? investor.capital - funded : Math.round((investor.capital / tranches) * randBetween(0.8, 1.2));
      const amount = Math.max(500, Math.round(share));
      funded += amount;
      await seedDeposit(investor.id, amount, daysAgo(170 - i * 45));
    }

    // Allocate roughly 70% of funded capital across one or two plans.
    const allocationBudget = Math.floor(funded * randBetween(0.55, 0.85));
    const chosen = plans.filter((p) => Number(p.minimumAmount) <= allocationBudget);
    if (chosen.length === 0) continue;

    const planCount = Math.min(chosen.length, allocationBudget > 40000 ? 2 : 1);
    let remaining = allocationBudget;

    for (let i = 0; i < planCount; i += 1) {
      const plan = chosen[Math.floor(rand() * chosen.length)];
      const amount =
        i === planCount - 1
          ? remaining
          : Math.floor(remaining * randBetween(0.4, 0.6));

      if (amount < Number(plan.minimumAmount)) continue;
      remaining -= amount;

      const openedDaysAgo = Math.floor(randBetween(60, 140));
      const investment = await seedInvestment(
        investor.id,
        plan.id,
        plan.name,
        amount,
        daysAgo(openedDaysAgo),
        plan.lockupDays,
      );

      // Monthly accruals since opening — mostly positive, occasionally not.
      const months = Math.floor(openedDaysAgo / 30);
      let value = amount;
      for (let m = 1; m <= months; m += 1) {
        const monthlyRate = randBetween(-0.9, 2.6);
        const gain = Number(((value * monthlyRate) / 100).toFixed(2));
        if (Math.abs(gain) < 0.01) continue;
        value += gain;

        await seedAccrual(
          investment.id,
          investor.id,
          plan.name,
          gain,
          monthlyRate,
          daysAgo(openedDaysAgo - (m - 1) * 30),
          daysAgo(Math.max(1, openedDaysAgo - m * 30)),
        );
      }
    }
  }

  // A couple of live items so the admin queues are not empty on first login.
  const [firstInvestor, secondInvestor] = investors.filter((i) => i.capital > 0);

  if (firstInvestor) {
    await prisma.depositRequest.create({
      data: {
        reference: reference("DEP", 9001),
        userId: firstInvestor.id,
        amount: money(15000),
        method: "USDT_TRC20",
        txHash: "0x8f2c4a1b9e7d3f6a5c8b2e4d1a7f9c3b6e8d2a4f1c7b9e3d5a8f2c4b6e1d9a3f",
        status: RequestStatus.PENDING,
        createdAt: daysAgo(1),
      },
    });
    await prisma.transaction.create({
      data: {
        userId: firstInvestor.id,
        type: TransactionType.DEPOSIT,
        status: "PENDING",
        amount: money(15000),
        description: "Deposit via USDT (TRC-20) — awaiting confirmation",
        reference: reference("DEP", 9001),
        createdAt: daysAgo(1),
      },
    });
  }

  if (secondInvestor) {
    await prisma.withdrawalRequest.create({
      data: {
        reference: reference("WDR", 9002),
        userId: secondInvestor.id,
        amount: money(4000),
        feeAmount: money(20),
        netAmount: money(3980),
        method: "BANK_TRANSFER",
        destination: {
          accountName: "J. Okonkwo",
          iban: "GB29NWBK60161331926819",
          bank: "NatWest",
        },
        status: RequestStatus.PENDING,
        createdAt: daysAgo(1),
      },
    });
    await prisma.transaction.create({
      data: {
        userId: secondInvestor.id,
        type: TransactionType.WITHDRAWAL,
        status: "PENDING",
        amount: money(-4000),
        description: "Withdrawal via bank transfer — under review",
        reference: reference("WDR", 9002),
        createdAt: daysAgo(1),
      },
    });
  }

  console.log("  ✓ deposits, allocations, accruals and pending queue items");
}

async function seedSettings() {
  const settings: { key: string; value: Prisma.InputJsonValue }[] = [
    { key: "platform.maintenanceMode", value: { enabled: false, message: "" } },
    {
      key: "platform.deposit",
      value: {
        minimum: 100,
        methods: ["BANK_TRANSFER", "BTC", "ETH", "USDT_TRC20"],
        autoApproveUnder: 0,
      },
    },
    {
      key: "platform.withdrawal",
      value: { minimum: 50, feePercent: 0.5, dailyLimit: 50000 },
    },
    {
      key: "platform.compliance",
      value: {
        kycRequiredForDeposit: false,
        kycRequiredForInvest: true,
        kycRequiredForWithdraw: true,
        reverifyAfterMonths: 24,
      },
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`  ✓ ${settings.length} platform settings`);
}

// ---------------------------------------------------------------------------

async function main() {
  console.log("\n▸ Seeding Axiom Capital\n");

  await ensureSystemAccounts(prisma);
  console.log("  ✓ system ledger accounts");

  await seedPlans();
  await seedAssets();
  await seedPosts();
  await seedSettings();

  await seedStaff();

  const plans = await prisma.investmentPlan.findMany({
    select: { id: true, name: true, slug: true, lockupDays: true, minimumAmount: true },
    orderBy: { sortOrder: "asc" },
  });

  const { investors } = await seedInvestors(plans);
  await seedActivity(investors, plans);

  const integrity = await verifyLedgerIntegrity();
  console.log(
    `\n  Ledger: ${integrity.entryCount} entries, ${integrity.lineCount} lines across ${integrity.accountCount} accounts`,
  );
  console.log(
    `  Integrity: ${integrity.balanced ? "BALANCED ✓" : `OUT OF BALANCE (${integrity.signedSum})`}`,
  );

  if (integrity.discrepancies.length > 0) {
    console.error("  Discrepancies:", integrity.discrepancies);
    throw new Error("Seeded ledger does not reconcile.");
  }

  console.log("\n  Sign in with:");
  console.log(`    Admin    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`    Investor demo@axiomcapital.example / ${DEMO_PASSWORD}\n`);
}

main()
  .catch((error) => {
    console.error("\n✗ Seed failed:\n", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
