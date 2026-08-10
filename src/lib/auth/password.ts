import "server-only";

import bcrypt from "bcryptjs";

/**
 * Hashing lives here; the strength rules live in `password-policy.ts` so the
 * client-side meter can import them without dragging bcrypt into the browser
 * bundle. Do not move `assessPassword` back into this file.
 */

/**
 * Cost 12 ≈ 250ms on commodity hardware in 2025 — slow enough to make offline
 * cracking expensive, fast enough that a login still feels instant.
 */
const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Burns roughly the same time as a real comparison. Called when the email does
 * not exist so response timing cannot be used to enumerate accounts.
 */
export async function fakeVerify(): Promise<void> {
  await bcrypt.compare(
    "timing-equaliser",
    "$2a$12$C6UzMDM.H6dfI/f/IKcEeO1M0Y0aM2Q0a0Q9dQqK1zFj2hZ5oQeYm",
  );
}

export {
  assessPassword,
  passwordMeetsPolicy,
  type PasswordStrength,
} from "@/lib/auth/password-policy";
