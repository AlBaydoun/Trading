import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/utils";

export const SESSION_COOKIE = "axiom_session";
const SESSION_TTL_DAYS = 14;
/** Sliding window: touch the expiry when a session is used inside this window. */
const REFRESH_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 3;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Generate one with: openssl rand -base64 48",
    );
  }
  return value;
}

/**
 * The cookie carries an opaque 32-byte token; the database stores only its
 * HMAC. A dump of the sessions table therefore cannot be replayed as a login.
 */
function hashToken(token: string): string {
  return createHmac("sha256", secret()).update(token).digest("hex");
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: User["status"];
  kycStatus: User["kycStatus"];
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  referralCode: string;
  createdAt: Date;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);

  const headerBag = await headers();

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ip: clientIp(headerBag),
      userAgent: headerBag.get("user-agent")?.slice(0, 255),
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

/**
 * Reads and validates the current session.
 *
 * Wrapped in React `cache` so a page that checks auth in the layout, the page
 * and three server components still issues exactly one query per request.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          kycStatus: true,
          avatarUrl: true,
          twoFactorEnabled: true,
          referralCode: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // A suspended or closed account loses its session immediately, without
  // waiting for the cookie to expire.
  if (session.user.status === "SUSPENDED" || session.user.status === "CLOSED") {
    return null;
  }

  if (session.expiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_MS) {
    await prisma.session
      .update({
        where: { id: session.id },
        data: { expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000) },
      })
      .catch(() => {});
  }

  return session.user;
});

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }

  jar.delete(SESSION_COOKIE);
}

/** Used when a password changes or an admin force-logs-out an account. */
export async function destroyAllSessionsForUser(userId: string): Promise<number> {
  const { count } = await prisma.session.deleteMany({ where: { userId } });
  return count;
}

/** Housekeeping — call from a cron route. */
export async function pruneExpiredSessions(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}

/** Constant-time string compare for CSRF tokens and one-time codes. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const ROLE_RANK: Record<Role, number> = {
  USER: 0,
  ANALYST: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function hasRole(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
