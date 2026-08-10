import bcrypt from "bcryptjs";

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

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  issues: string[];
}

const COMMON_PASSWORDS = new Set([
  "password", "12345678", "qwerty123", "password1", "111111", "123456789",
  "letmein", "welcome", "admin123", "iloveyou", "trustno1", "sunshine",
  "bitcoin1", "trading1", "passw0rd", "monkey123", "dragon12",
]);

/** Mirrored on the client for the strength meter and on the server for policy. */
export function assessPassword(password: string): PasswordStrength {
  const issues: string[] = [];

  if (password.length < 10) issues.push("Use at least 10 characters");
  if (!/[a-z]/.test(password)) issues.push("Add a lowercase letter");
  if (!/[A-Z]/.test(password)) issues.push("Add an uppercase letter");
  if (!/\d/.test(password)) issues.push("Add a number");
  if (!/[^A-Za-z0-9]/.test(password)) issues.push("Add a symbol");
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    issues.push("This password appears in breach lists");
  }
  if (/(.)\1{3,}/.test(password)) issues.push("Avoid repeated characters");

  const passed = 5 - Math.min(5, issues.length);
  const bonus = password.length >= 16 ? 1 : 0;
  const score = Math.min(4, Math.max(0, passed - 1 + bonus)) as 0 | 1 | 2 | 3 | 4;

  const labels = ["Very weak", "Weak", "Fair", "Strong", "Excellent"];
  return { score, label: labels[score], issues };
}

/** Server-side policy gate. Registration rejects anything below this bar. */
export function passwordMeetsPolicy(password: string): boolean {
  return (
    password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    !COMMON_PASSWORDS.has(password.toLowerCase())
  );
}
