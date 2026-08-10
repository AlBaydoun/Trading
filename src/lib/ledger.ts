import {
  AccountType,
  EntryType,
  LedgerDirection,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dec, generateReference } from "@/lib/money";

/**
 * =============================================================================
 * DOUBLE-ENTRY LEDGER
 * =============================================================================
 * Every movement of value is a balanced JournalEntry. Debits must equal credits
 * or the post is rejected — there is no code path that writes a single-sided
 * line. `LedgerAccount.balance` is a cache updated inside the same database
 * transaction as the lines, so it can never drift while a transaction commits;
 * `verifyLedgerIntegrity()` re-derives it from the lines to prove that.
 *
 * Sign convention: `balance` is always the account's *natural* balance.
 *   ASSET, EXPENSE            → increase on DEBIT
 *   LIABILITY, EQUITY, INCOME → increase on CREDIT
 * An investor's cash is a LIABILITY: the platform owes it to them.
 * =============================================================================
 */

export const SYSTEM_ACCOUNTS = {
  BANK_FIAT: {
    code: "system:bank:fiat",
    name: "Client money — bank",
    type: AccountType.ASSET,
  },
  CUSTODY_CRYPTO: {
    code: "system:custody:crypto",
    name: "Client assets — crypto custody",
    type: AccountType.ASSET,
  },
  FEES_MANAGEMENT: {
    code: "system:fees:management",
    name: "Revenue — management fees",
    type: AccountType.INCOME,
  },
  FEES_PERFORMANCE: {
    code: "system:fees:performance",
    name: "Revenue — performance fees",
    type: AccountType.INCOME,
  },
  FEES_WITHDRAWAL: {
    code: "system:fees:withdrawal",
    name: "Revenue — withdrawal fees",
    type: AccountType.INCOME,
  },
  PROMOTIONS: {
    code: "system:expense:promotions",
    name: "Expense — referral and promotions",
    type: AccountType.EXPENSE,
  },
  ADJUSTMENTS: {
    code: "system:equity:adjustments",
    name: "Equity — manual adjustments",
    type: AccountType.EQUITY,
  },
} as const;

export type UserAccountPurpose = "cash" | "invested";

export function userAccountCode(
  userId: string,
  purpose: UserAccountPurpose,
): string {
  return `user:${purpose}:${userId}`;
}

type Tx = Prisma.TransactionClient;

/** DEBIT increases these; CREDIT decreases them. The inverse holds for the rest. */
const DEBIT_POSITIVE = new Set<AccountType>([
  AccountType.ASSET,
  AccountType.EXPENSE,
]);

export function signedDelta(
  type: AccountType,
  direction: LedgerDirection,
  amount: Prisma.Decimal,
): Prisma.Decimal {
  const increasesOnDebit = DEBIT_POSITIVE.has(type);
  const isDebit = direction === LedgerDirection.DEBIT;
  return increasesOnDebit === isDebit ? amount : amount.negated();
}

// -----------------------------------------------------------------------------
// Account provisioning
// -----------------------------------------------------------------------------

/** Idempotent. Safe to call on every boot and from the seed script. */
export async function ensureSystemAccounts(client: Tx | typeof prisma = prisma) {
  for (const account of Object.values(SYSTEM_ACCOUNTS)) {
    await client.ledgerAccount.upsert({
      where: { code: account.code },
      update: { name: account.name, type: account.type },
      create: {
        code: account.code,
        name: account.name,
        type: account.type,
        isSystem: true,
      },
    });
  }
}

/** Creates the investor's cash and invested accounts on first use. */
export async function ensureUserAccounts(
  client: Tx | typeof prisma,
  userId: string,
  currency = "USD",
) {
  const specs: { purpose: UserAccountPurpose; name: string }[] = [
    { purpose: "cash", name: "Investor cash balance" },
    { purpose: "invested", name: "Investor allocated capital" },
  ];

  for (const spec of specs) {
    await client.ledgerAccount.upsert({
      where: { code: userAccountCode(userId, spec.purpose) },
      update: {},
      create: {
        code: userAccountCode(userId, spec.purpose),
        name: spec.name,
        type: AccountType.LIABILITY,
        currency,
        userId,
      },
    });
  }
}

// -----------------------------------------------------------------------------
// Posting
// -----------------------------------------------------------------------------

export interface LineInput {
  accountCode: string;
  direction: LedgerDirection;
  amount: Prisma.Decimal | number | string;
  memo?: string;
}

export interface PostEntryInput {
  type: EntryType;
  description: string;
  lines: LineInput[];
  reference?: string;
  currency?: string;
  occurredAt?: Date;
  createdById?: string | null;
  metadata?: Prisma.InputJsonValue;
  reversesId?: string;
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerError";
  }
}

/**
 * Posts a balanced entry. MUST be called inside a `prisma.$transaction` when it
 * accompanies other writes (approving a request, opening a position) so the
 * ledger and the business record commit or fail together.
 */
export async function postEntry(
  tx: Tx,
  input: PostEntryInput,
): Promise<{ entryId: string; reference: string }> {
  const {
    type,
    description,
    lines,
    currency = "USD",
    occurredAt = new Date(),
    createdById = null,
    metadata,
    reversesId,
  } = input;

  if (lines.length < 2) {
    throw new LedgerError("A journal entry needs at least two lines.");
  }

  let debits = new Prisma.Decimal(0);
  let credits = new Prisma.Decimal(0);

  for (const line of lines) {
    const amount = dec(line.amount);
    if (amount.lte(0)) {
      throw new LedgerError(
        `Line amounts must be positive; got ${amount.toString()} for ${line.accountCode}. Flip the direction instead of using a negative amount.`,
      );
    }
    if (line.direction === LedgerDirection.DEBIT) debits = debits.add(amount);
    else credits = credits.add(amount);
  }

  if (!debits.equals(credits)) {
    throw new LedgerError(
      `Unbalanced entry: debits ${debits.toString()} ≠ credits ${credits.toString()}.`,
    );
  }

  // Resolve every account up front so a bad code fails before any write.
  const codes = [...new Set(lines.map((l) => l.accountCode))];
  const accounts = await tx.ledgerAccount.findMany({
    where: { code: { in: codes } },
  });

  if (accounts.length !== codes.length) {
    const found = new Set(accounts.map((a) => a.code));
    const missing = codes.filter((c) => !found.has(c));
    throw new LedgerError(`Unknown ledger account(s): ${missing.join(", ")}`);
  }

  const byCode = new Map(accounts.map((a) => [a.code, a]));
  const reference = input.reference ?? generateReference("JE");

  const entry = await tx.journalEntry.create({
    data: {
      reference,
      type,
      description,
      currency,
      occurredAt,
      createdById,
      metadata,
      reversesId,
      lines: {
        create: lines.map((line) => ({
          accountId: byCode.get(line.accountCode)!.id,
          direction: line.direction,
          amount: dec(line.amount),
          currency,
          memo: line.memo,
        })),
      },
    },
  });

  // Fold multiple lines against the same account into one balance update.
  const deltas = new Map<string, Prisma.Decimal>();
  for (const line of lines) {
    const account = byCode.get(line.accountCode)!;
    const delta = signedDelta(account.type, line.direction, dec(line.amount));
    deltas.set(
      account.id,
      (deltas.get(account.id) ?? new Prisma.Decimal(0)).add(delta),
    );
  }

  for (const [accountId, delta] of deltas) {
    if (delta.isZero()) continue;
    await tx.ledgerAccount.update({
      where: { id: accountId },
      data: { balance: { increment: delta } },
    });
  }

  return { entryId: entry.id, reference };
}

/**
 * Posts the mirror image of an existing entry. Ledgers are append-only: a
 * mistake is corrected by reversal, never by editing or deleting history.
 */
export async function reverseEntry(
  tx: Tx,
  entryId: string,
  reason: string,
  actorId?: string | null,
): Promise<{ entryId: string; reference: string }> {
  const original = await tx.journalEntry.findUnique({
    where: { id: entryId },
    include: { lines: { include: { account: true } }, reversedBy: true },
  });

  if (!original) throw new LedgerError("Entry not found.");
  if (original.reversedBy) throw new LedgerError("Entry is already reversed.");

  return postEntry(tx, {
    type: EntryType.REVERSAL,
    description: `Reversal of ${original.reference}: ${reason}`,
    currency: original.currency,
    createdById: actorId ?? null,
    reversesId: original.id,
    metadata: { reason, originalReference: original.reference },
    lines: original.lines.map((line) => ({
      accountCode: line.account.code,
      direction:
        line.direction === LedgerDirection.DEBIT
          ? LedgerDirection.CREDIT
          : LedgerDirection.DEBIT,
      amount: line.amount,
      memo: line.memo ?? undefined,
    })),
  });
}

// -----------------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------------

export interface UserBalances {
  cash: Prisma.Decimal;
  invested: Prisma.Decimal;
  total: Prisma.Decimal;
}

export async function getUserBalances(userId: string): Promise<UserBalances> {
  const accounts = await prisma.ledgerAccount.findMany({
    where: {
      userId,
      code: {
        in: [userAccountCode(userId, "cash"), userAccountCode(userId, "invested")],
      },
    },
  });

  const cash =
    accounts.find((a) => a.code === userAccountCode(userId, "cash"))?.balance ??
    new Prisma.Decimal(0);
  const invested =
    accounts.find((a) => a.code === userAccountCode(userId, "invested"))
      ?.balance ?? new Prisma.Decimal(0);

  return { cash, invested, total: cash.add(invested) };
}

/** Platform-wide totals for the admin dashboard. */
export async function getPlatformTotals() {
  const accounts = await prisma.ledgerAccount.groupBy({
    by: ["type"],
    _sum: { balance: true },
  });

  const byType = new Map(
    accounts.map((row) => [row.type, row._sum.balance ?? new Prisma.Decimal(0)]),
  );

  const zero = new Prisma.Decimal(0);
  const assets = byType.get(AccountType.ASSET) ?? zero;
  const liabilities = byType.get(AccountType.LIABILITY) ?? zero;
  const income = byType.get(AccountType.INCOME) ?? zero;
  const expenses = byType.get(AccountType.EXPENSE) ?? zero;

  return {
    assets,
    liabilities,
    income,
    expenses,
    netRevenue: income.sub(expenses),
    /** Assets under management = what the platform owes its investors. */
    aum: liabilities,
  };
}

/**
 * Re-derives every account balance from the journal lines and reports drift.
 * Exposed in the admin console — an accountant should be able to prove the
 * cached balances at any moment, and the whole book must sum to zero.
 */
export async function verifyLedgerIntegrity() {
  const accounts = await prisma.ledgerAccount.findMany({
    include: { lines: true },
  });

  const discrepancies: {
    code: string;
    name: string;
    cached: string;
    derived: string;
    drift: string;
  }[] = [];

  let signedSum = new Prisma.Decimal(0);

  for (const account of accounts) {
    let derived = new Prisma.Decimal(0);
    for (const line of account.lines) {
      derived = derived.add(signedDelta(account.type, line.direction, line.amount));
    }

    if (!derived.equals(account.balance)) {
      discrepancies.push({
        code: account.code,
        name: account.name,
        cached: account.balance.toFixed(8),
        derived: derived.toFixed(8),
        drift: account.balance.sub(derived).toFixed(8),
      });
    }

    // Assets/expenses carry a positive natural balance, everything else the
    // mirror — so a consistent book sums to zero once signs are aligned.
    signedSum = DEBIT_POSITIVE.has(account.type)
      ? signedSum.add(derived)
      : signedSum.sub(derived);
  }

  const [entryCount, lineCount] = await Promise.all([
    prisma.journalEntry.count(),
    prisma.journalLine.count(),
  ]);

  return {
    balanced: signedSum.isZero() && discrepancies.length === 0,
    signedSum: signedSum.toFixed(8),
    discrepancies,
    accountCount: accounts.length,
    entryCount,
    lineCount,
    checkedAt: new Date(),
  };
}
