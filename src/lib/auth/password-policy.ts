/**
 * Password rules, deliberately free of any server-only dependency.
 *
 * The registration form renders a live strength meter, so this module gets
 * bundled for the browser. Keeping it separate from `password.ts` — which pulls
 * in bcrypt — stops a ~130 kB hashing library shipping to every visitor who
 * opens the sign-up page. The server imports the same functions so the meter
 * and the policy gate can never disagree.
 */

const COMMON_PASSWORDS = new Set([
  "password", "12345678", "qwerty123", "password1", "111111", "123456789",
  "letmein", "welcome", "admin123", "iloveyou", "trustno1", "sunshine",
  "bitcoin1", "trading1", "passw0rd", "monkey123", "dragon12",
]);

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  issues: string[];
}

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
