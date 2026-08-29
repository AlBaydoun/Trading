import { z } from "zod";

/**
 * Every server action parses its input through one of these. Client-side
 * validation is a convenience; this is the boundary that actually holds.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Enter a valid email address")
  .max(254)
  .email("Enter a valid email address");

const name = z
  .string()
  .trim()
  .min(2, "Too short")
  .max(60, "Too long")
  .regex(/^[\p{L}\p{M}'’\- .]+$/u, "Letters, spaces, apostrophes and hyphens only");

/** Money arrives from forms as a string. Reject NaN, negatives and silly precision. */
export const moneyString = z
  .string()
  .trim()
  .min(1, "Enter an amount")
  .transform((v) => v.replace(/[,\s_]/g, ""))
  .refine((v) => /^\d+(\.\d{1,8})?$/.test(v), "Enter a valid amount")
  .refine((v) => Number(v) > 0, "Amount must be greater than zero");

export const registerSchema = z
  .object({
    firstName: name,
    lastName: name,
    email,
    password: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(200, "That is too long")
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/\d/, "Add a number"),
    confirmPassword: z.string(),
    country: z.string().length(2, "Select your country").optional().or(z.literal("")),
    referralCode: z.string().trim().max(24).optional().or(z.literal("")),
    acceptTerms: z
      .union([z.literal("on"), z.literal("true"), z.boolean()])
      .refine((v) => v === "on" || v === "true" || v === true, {
        message: "You must accept the terms and risk disclosure",
      }),
    marketingOptIn: z.union([z.literal("on"), z.boolean()]).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
  next: z.string().optional(),
});

export const profileSchema = z.object({
  firstName: name,
  lastName: name,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  country: z.string().length(2).optional().or(z.literal("")),
  riskProfile: z.enum(["CONSERVATIVE", "BALANCED", "GROWTH", "AGGRESSIVE"]),
  marketingOptIn: z.union([z.literal("on"), z.boolean()]).optional(),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(10, "Use at least 10 characters")
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/\d/, "Add a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "Choose a password you have not used here before",
    path: ["newPassword"],
  });

export const kycSchema = z.object({
  documentType: z.enum(["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENCE"]),
  documentNumber: z.string().trim().min(4, "Enter the document number").max(40),
  documentExpiry: z.string().optional().or(z.literal("")),
  dateOfBirth: z
    .string()
    .min(1, "Enter your date of birth")
    .refine((v) => {
      const dob = new Date(v);
      if (Number.isNaN(dob.getTime())) return false;
      const eighteen = new Date();
      eighteen.setFullYear(eighteen.getFullYear() - 18);
      return dob <= eighteen;
    }, "You must be at least 18 years old"),
  nationality: z.string().length(2, "Select your nationality"),
  addressLine1: z.string().trim().min(4, "Enter your address").max(120),
  addressLine2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter your city").max(60),
  region: z.string().trim().max(60).optional().or(z.literal("")),
  postalCode: z.string().trim().min(2, "Enter your postal code").max(20),
  country: z.string().length(2, "Select your country"),
  occupation: z.string().trim().max(80).optional().or(z.literal("")),
  sourceOfFunds: z.enum([
    "EMPLOYMENT",
    "BUSINESS_INCOME",
    "INVESTMENTS",
    "INHERITANCE",
    "SALE_OF_ASSETS",
    "SAVINGS",
    "OTHER",
  ]),
  expectedVolume: z.string().max(40).optional().or(z.literal("")),
  isPep: z.union([z.literal("on"), z.boolean()]).optional(),
  taxResidency: z.string().length(2).optional().or(z.literal("")),
});

export const depositSchema = z.object({
  amount: moneyString,
  method: z.enum([
    "BANK_TRANSFER",
    "BTC",
    "ETH",
    "USDT_TRC20",
    "USDT_ERC20",
    "CARD",
  ]),
  senderReference: z.string().trim().max(120).optional().or(z.literal("")),
  txHash: z.string().trim().max(160).optional().or(z.literal("")),
});

export const withdrawalSchema = z
  .object({
    amount: moneyString,
    method: z.enum([
      "BANK_TRANSFER",
      "BTC",
      "ETH",
      "USDT_TRC20",
      "USDT_ERC20",
    ]),
    destination: z.string().trim().min(6, "Enter where the funds should go").max(200),
    accountName: z.string().trim().max(120).optional().or(z.literal("")),
    note: z.string().trim().max(280).optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      d.method !== "BANK_TRANSFER" ||
      (d.accountName !== undefined && d.accountName.length >= 2),
    { message: "Enter the account holder name", path: ["accountName"] },
  );

export const investSchema = z.object({
  planId: z.string().min(1, "Choose a plan"),
  amount: moneyString,
  autoRenew: z.union([z.literal("on"), z.boolean()]).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Add a subject").max(120),
  message: z.string().trim().min(20, "Tell us a little more").max(4000),
  investmentRange: z.string().max(40).optional().or(z.literal("")),
  /** Honeypot — real users never fill this. */
  website: z.string().max(0).optional().or(z.literal("")),
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const reviewSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const accrualSchema = z.object({
  investmentId: z.string().min(1),
  amount: z
    .string()
    .trim()
    .transform((v) => v.replace(/[,\s_]/g, ""))
    .refine((v) => /^-?\d+(\.\d{1,8})?$/.test(v), "Enter a valid amount")
    .refine((v) => Number(v) !== 0, "Amount cannot be zero"),
  ratePct: z
    .string()
    .trim()
    .refine((v) => /^-?\d+(\.\d{1,4})?$/.test(v), "Enter a valid rate"),
  note: z.string().trim().max(280).optional().or(z.literal("")),
});

export const adjustmentSchema = z.object({
  userId: z.string().min(1),
  amount: moneyString,
  direction: z.enum(["CREDIT", "DEBIT"]),
  reason: z.string().trim().min(6, "Explain why — this is auditable").max(400),
});

export const planSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, "Name the plan").max(60),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only")
    .max(60),
  tagline: z.string().trim().min(6, "Add a one-line summary").max(140),
  description: z.string().trim().min(30, "Describe the strategy").max(4000),
  minimumAmount: moneyString,
  maximumAmount: z.string().trim().optional().or(z.literal("")),
  targetApyLow: z.string().trim().refine((v) => !Number.isNaN(Number(v)), "Invalid"),
  targetApyHigh: z.string().trim().refine((v) => !Number.isNaN(Number(v)), "Invalid"),
  managementFeePct: z.string().trim().default("0"),
  performanceFeePct: z.string().trim().default("0"),
  earlyExitFeePct: z.string().trim().default("0"),
  lockupDays: z.coerce.number().int().min(0).max(3650),
  payoutFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ON_MATURITY"]),
  riskLevel: z.enum(["LOW", "MODERATE", "HIGH", "VERY_HIGH"]),
  highlights: z.string().max(1200).optional().or(z.literal("")),
  allocation: z.string().min(2, "Provide the allocation breakdown"),
  isActive: z.union([z.literal("on"), z.boolean()]).optional(),
  isFeatured: z.union([z.literal("on"), z.boolean()]).optional(),
});

export const userAdminSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"]).optional(),
  role: z.enum(["USER", "ANALYST", "ADMIN", "SUPER_ADMIN"]).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export type FieldErrors = Record<string, string>;

/** Flattens a ZodError into `{ fieldName: firstMessage }` for form rendering. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function checkboxToBool(value: unknown): boolean {
  return value === "on" || value === true || value === "true";
}
