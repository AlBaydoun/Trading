import "server-only";

import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/utils";

/**
 * Append-only record of who did what. Every state change made through the admin
 * console writes one of these; a regulator asking "who approved this
 * withdrawal, when, and what did the record look like before?" gets an answer.
 */

export interface AuditInput {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string; // dot-namespaced: "deposit.approve", "user.suspend"
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

/** Values that must never reach the audit table even if a caller passes them. */
const REDACTED_KEYS = new Set([
  "passwordHash",
  "password",
  "twoFactorSecret",
  "tokenHash",
  "token",
  "documentNumber",
  "taxIdentifier",
]);

function redact(value: unknown, depth = 0): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (depth > 6) return "[max-depth]";

  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1) ?? null) as Prisma.InputJsonValue;
  }

  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    // Prisma Decimal and similar wrappers serialise cleanly via toString.
    if ("toFixed" in (value as object) && typeof (value as { toFixed: unknown }).toFixed === "function") {
      return String(value);
    }
    const out: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_KEYS.has(key)) {
        out[key] = "[redacted]";
        continue;
      }
      const cleaned = redact(val, depth + 1);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }

  if (typeof value === "bigint") return value.toString();
  return value as Prisma.InputJsonValue;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const headerBag = await headers();

    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before: redact(input.before),
        after: redact(input.after),
        ip: clientIp(headerBag),
        userAgent: headerBag.get("user-agent")?.slice(0, 255),
      },
    });
  } catch (error) {
    // Auditing must never take down the operation it is describing, but a
    // silent failure here is a compliance gap — make it loud in the logs.
    console.error("[audit] failed to write entry", input.action, error);
  }
}

/** Human labels for the admin log viewer. */
export const AUDIT_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.register": "Account created",
  "auth.password_change": "Password changed",
  "user.suspend": "Account suspended",
  "user.reactivate": "Account reactivated",
  "user.role_change": "Role changed",
  "user.note": "Internal note updated",
  "kyc.submit": "KYC submitted",
  "kyc.approve": "KYC approved",
  "kyc.reject": "KYC rejected",
  "deposit.create": "Deposit requested",
  "deposit.approve": "Deposit approved",
  "deposit.reject": "Deposit rejected",
  "withdrawal.create": "Withdrawal requested",
  "withdrawal.approve": "Withdrawal approved",
  "withdrawal.reject": "Withdrawal rejected",
  "investment.open": "Investment opened",
  "investment.close": "Investment closed",
  "investment.accrue": "Return credited",
  "plan.create": "Plan created",
  "plan.update": "Plan updated",
  "plan.archive": "Plan archived",
  "ledger.adjust": "Manual adjustment posted",
  "ledger.reverse": "Journal entry reversed",
};

export function auditLabel(action: string): string {
  return AUDIT_LABELS[action] ?? action.replace(/[._]/g, " ");
}
