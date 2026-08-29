import "server-only";

import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getSession, hasRole, type SessionUser } from "@/lib/auth/session";

/**
 * Authoritative auth checks. Middleware does a cheap optimistic redirect on
 * cookie presence; these functions are what actually protect data, and every
 * private page and server action calls one of them.
 */

export async function requireUser(
  returnTo?: string,
): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${next}`);
  }
  return user;
}

export async function requireRole(minimum: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user.role, minimum)) {
    redirect("/dashboard?error=insufficient-permissions");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("ANALYST");
}

/** For actions that move money — analysts are read-only and must not pass. */
export async function requireApprover(): Promise<SessionUser> {
  return requireRole("ADMIN");
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  return requireRole("SUPER_ADMIN");
}

/**
 * Investors must clear KYC before capital can move. Returns a reason rather
 * than redirecting so callers can render an inline prompt instead of a bounce.
 */
export function transactionBlockReason(user: SessionUser): string | null {
  if (user.status === "PENDING") {
    return "Confirm your email address to activate transfers.";
  }
  if (user.status === "SUSPENDED") {
    return "Your account is under compliance review. Contact support.";
  }
  if (user.status === "CLOSED") {
    return "This account is closed.";
  }
  if (user.kycStatus !== "APPROVED") {
    return "Identity verification must be approved before you can move funds.";
  }
  return null;
}

export function canTransact(user: SessionUser): boolean {
  return transactionBlockReason(user) === null;
}

/** Non-redirecting variant for server actions that return typed errors. */
export async function getActor(): Promise<SessionUser | null> {
  return getSession();
}
