import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { toNumber } from "@/lib/money";

/**
 * CSV export of the investor's own ledger. Scoped to the session user — there
 * is no id parameter, so there is nothing to tamper with.
 */

/** RFC 4180 quoting: wrap in quotes, double any internal quote. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // A leading =, +, - or @ makes a spreadsheet treat the cell as a formula.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { journalEntry: { select: { reference: true, type: true } } },
  });

  const header = [
    "Date",
    "Type",
    "Status",
    "Description",
    "Reference",
    "Journal entry",
    "Amount",
    "Currency",
    "Balance after",
  ];

  const rows = transactions.map((transaction) =>
    [
      transaction.createdAt.toISOString(),
      transaction.type,
      transaction.status,
      transaction.description,
      transaction.reference,
      transaction.journalEntry?.reference ?? "",
      toNumber(transaction.amount).toFixed(2),
      transaction.currency,
      transaction.balanceAfter ? toNumber(transaction.balanceAfter).toFixed(2) : "",
    ].map(csvCell).join(","),
  );

  // BOM so Excel opens UTF-8 correctly instead of mangling accented names.
  const body = `﻿${[header.map(csvCell).join(","), ...rows].join("\r\n")}\r\n`;

  const filename = `axiom-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
