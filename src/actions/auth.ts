"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  fakeVerify,
  passwordMeetsPolicy,
} from "@/lib/auth/password";
import {
  createSession,
  destroySession,
  destroyAllSessionsForUser,
  getSession,
} from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { checkLimit, retryAfterMessage } from "@/lib/rate-limit";
import { ensureUserAccounts } from "@/lib/ledger";
import {
  registerSchema,
  loginSchema,
  passwordChangeSchema,
  profileSchema,
  fieldErrors,
  checkboxToBool,
  type FieldErrors,
} from "@/lib/validation";
import { clientIp } from "@/lib/utils";

export interface FormState {
  ok: boolean;
  message?: string;
  errors?: FieldErrors;
}

export const emptyFormState: FormState = { ok: false };

/** Lock an account after this many consecutive failures. */
const MAX_FAILED_LOGINS = 6;
const LOCKOUT_MINUTES = 20;

async function uniqueReferralCode(seed: string): Promise<string> {
  const base = seed.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "AXIO";

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `${base}${suffix}`.slice(0, 12);
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  // Astronomically unlikely; fall back to something guaranteed unique.
  return `AX${Date.now().toString(36).toUpperCase()}`;
}

// -----------------------------------------------------------------------------
// Register
// -----------------------------------------------------------------------------

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const headerBag = await headers();
  const ip = clientIp(headerBag) ?? "unknown";

  const limit = checkLimit("register", ip);
  if (!limit.ok) return { ok: false, message: retryAfterMessage(limit) };

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const data = parsed.data;

  if (!passwordMeetsPolicy(data.password)) {
    return {
      ok: false,
      errors: { password: "That password is too easy to guess. Try a longer one." },
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (existing) {
    // Do not confirm which addresses are registered.
    return {
      ok: false,
      errors: {
        email:
          "We could not create an account with those details. If you already have one, sign in instead.",
      },
    };
  }

  let referredById: string | null = null;
  if (data.referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: data.referralCode.toUpperCase() },
      select: { id: true },
    });
    referredById = referrer?.id ?? null;
  }

  const passwordHash = await hashPassword(data.password);
  const referralCode = await uniqueReferralCode(data.firstName);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        country: data.country || null,
        referralCode,
        referredById,
        marketingOptIn: checkboxToBool(data.marketingOptIn),
        // Email confirmation is a separate flow; a new account starts ACTIVE
        // for browsing but cannot move money until KYC is approved.
        status: "ACTIVE",
      },
    });

    await ensureUserAccounts(tx, created.id);

    await tx.notification.create({
      data: {
        userId: created.id,
        type: "INFO",
        title: "Welcome to Axiom Capital",
        body: "Complete identity verification to unlock deposits and investing.",
        href: "/dashboard/verification",
      },
    });

    return created;
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "auth.register",
    entityType: "User",
    entityId: user.id,
    after: { email: user.email, referredById },
  });

  await createSession(user.id);
  redirect("/dashboard?welcome=1");
}

// -----------------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------------

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const headerBag = await headers();
  const ip = clientIp(headerBag) ?? "unknown";

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const { email, password, next } = parsed.data;

  const byIp = checkLimit("login", ip);
  const byEmail = checkLimit("login", email);
  if (!byIp.ok || !byEmail.ok) {
    await prisma.loginAttempt.create({
      data: { email, ip, success: false, userAgent: "rate-limited" },
    });
    return { ok: false, message: retryAfterMessage(byIp.ok ? byEmail : byIp) };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic message and similar timing whether or not the account exists.
  const genericFailure: FormState = {
    ok: false,
    message: "Email or password is incorrect.",
  };

  if (!user) {
    await fakeVerify();
    await prisma.loginAttempt.create({ data: { email, ip, success: false } });
    return genericFailure;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return {
      ok: false,
      message: `Account temporarily locked after repeated failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const failed = user.failedLogins + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: failed,
        lockedUntil:
          failed >= MAX_FAILED_LOGINS
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
            : null,
      },
    });
    await prisma.loginAttempt.create({ data: { email, ip, success: false } });

    if (failed >= MAX_FAILED_LOGINS) {
      return {
        ok: false,
        message: `Too many failed attempts. This account is locked for ${LOCKOUT_MINUTES} minutes.`,
      };
    }
    return genericFailure;
  }

  if (user.status === "SUSPENDED") {
    return {
      ok: false,
      message:
        "This account is suspended pending compliance review. Contact support for help.",
    };
  }
  if (user.status === "CLOSED") {
    return { ok: false, message: "This account has been closed." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    }),
    prisma.loginAttempt.create({ data: { email, ip, success: true } }),
  ]);

  // Older accounts predate the ledger, and a fresh admin seed may not have run.
  await ensureUserAccounts(prisma, user.id);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
  });

  await createSession(user.id);

  // Only ever redirect to a path on this origin.
  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  redirect(target ?? (user.role === "USER" ? "/dashboard" : "/admin"));
}

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------

export async function logoutAction(): Promise<void> {
  const user = await getSession();
  if (user) {
    await recordAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.logout",
      entityType: "User",
      entityId: user.id,
    });
  }
  await destroySession();
  redirect("/login");
}

// -----------------------------------------------------------------------------
// Profile and password
// -----------------------------------------------------------------------------

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Your session expired." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const before = await prisma.user.findUnique({
    where: { id: session.id },
    select: { firstName: true, lastName: true, phone: true, country: true, riskProfile: true },
  });

  const data = parsed.data;
  await prisma.user.update({
    where: { id: session.id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      country: data.country || null,
      riskProfile: data.riskProfile,
      marketingOptIn: checkboxToBool(data.marketingOptIn),
    },
  });

  await recordAudit({
    actorId: session.id,
    actorEmail: session.email,
    action: "user.profile_update",
    entityType: "User",
    entityId: session.id,
    before,
    after: data,
  });

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Profile updated." };
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Your session expired." };

  const limit = checkLimit("passwordChange", session.id);
  if (!limit.ok) return { ok: false, message: retryAfterMessage(limit) };

  const parsed = passwordChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { ok: false, message: "Account not found." };

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false, errors: { currentPassword: "That is not your current password." } };
  }

  if (!passwordMeetsPolicy(parsed.data.newPassword)) {
    return { ok: false, errors: { newPassword: "Choose a stronger password." } };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "auth.password_change",
    entityType: "User",
    entityId: user.id,
  });

  // Every other device is signed out; this one gets a fresh cookie.
  await destroyAllSessionsForUser(user.id);
  await createSession(user.id);

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Password changed. Other devices were signed out." };
}
