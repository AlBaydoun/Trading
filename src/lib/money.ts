import { Prisma } from "@prisma/client";

export type Decimalish = Prisma.Decimal | number | string;

export const D = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

/** Coerce anything money-shaped into a Decimal. Never use `Number()` on money. */
export function dec(value: Decimalish | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  return value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(value);
}

/**
 * Decimals cannot cross the server/client boundary as-is (they are class
 * instances). Convert at the edge — once, in the query layer — so components
 * only ever see plain numbers.
 */
export function toNumber(value: Decimalish | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return value instanceof Prisma.Decimal
    ? value.toNumber()
    : Number(value);
}

/** Rounds to cents, half-up, the way an accountant expects. */
export function roundCents(value: Decimalish): Prisma.Decimal {
  return dec(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** Rounds to 8 dp for crypto-denominated amounts. */
export function roundCrypto(value: Decimalish): Prisma.Decimal {
  return dec(value).toDecimalPlaces(8, Prisma.Decimal.ROUND_HALF_UP);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const CURRENCY_FRACTION: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  BTC: 8,
  ETH: 6,
};

export function formatMoney(
  value: Decimalish | null | undefined,
  currency = "USD",
  options: { compact?: boolean; signed?: boolean; locale?: string } = {},
): string {
  const n = toNumber(value);
  const { compact = false, signed = false, locale = "en-US" } = options;
  const fraction = CURRENCY_FRACTION[currency] ?? 2;

  // Intl only knows ISO currencies — render crypto tickers as a suffix.
  const isIso = /^[A-Z]{3}$/.test(currency) && !["BTC", "ETH"].includes(currency);

  const formatted = new Intl.NumberFormat(locale, {
    style: isIso ? "currency" : "decimal",
    currency: isIso ? currency : undefined,
    minimumFractionDigits: compact ? 0 : fraction,
    maximumFractionDigits: compact && Math.abs(n) >= 10_000 ? 1 : fraction,
    notation: compact && Math.abs(n) >= 10_000 ? "compact" : "standard",
  }).format(Math.abs(n));

  const sign = n < 0 ? "−" : signed && n > 0 ? "+" : "";
  return isIso ? `${sign}${formatted}` : `${sign}${formatted} ${currency}`;
}

/** Compact money for stat tiles: $1.2M, $840K, $12.50. */
export function formatCompactMoney(
  value: Decimalish | null | undefined,
  currency = "USD",
): string {
  return formatMoney(value, currency, { compact: true });
}

export function formatNumber(
  value: Decimalish | null | undefined,
  maximumFractionDigits = 2,
): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(
    toNumber(value),
  );
}

export function formatPercent(
  value: Decimalish | null | undefined,
  options: { signed?: boolean; digits?: number } = {},
): string {
  const { signed = true, digits = 2 } = options;
  const n = toNumber(value);
  const sign = n > 0 && signed ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(digits)}%`;
}

/**
 * Prices span nine orders of magnitude on a crypto board — BTC at 68,000 and
 * SHIB at 0.0000094 cannot share a fraction-digit setting.
 */
export function formatPrice(value: Decimalish | null | undefined): string {
  const n = toNumber(value);
  const abs = Math.abs(n);
  let digits = 2;
  if (abs > 0 && abs < 0.0001) digits = 8;
  else if (abs < 0.01) digits = 6;
  else if (abs < 1) digits = 4;
  else if (abs < 1000) digits = 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/**
 * Formats a quote the way its own market quotes it. A bond row is a yield in
 * percent, an FX pair carries four or five decimals by convention, and an index
 * is a level with no currency symbol — rendering all three as "$" would be
 * wrong in three different ways.
 */
export function formatQuote(
  value: Decimalish | null | undefined,
  kind: string,
): string {
  const n = toNumber(value);

  if (kind === "BOND") {
    // Bond *funds* are priced per share; sovereign yields are percentages.
    return Math.abs(n) < 25 ? `${n.toFixed(3)}%` : formatPrice(n);
  }

  if (kind === "FOREX") {
    // Yen crosses trade to two decimals, everything else to four.
    return n >= 20 ? n.toFixed(2) : n.toFixed(4);
  }

  if (kind === "INDEX") {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  return formatPrice(n);
}

export function formatDate(
  value: Date | string | null | undefined,
  style: "short" | "long" | "datetime" = "short",
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";

  if (style === "long") {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "long",
    }).format(d);
  }
  if (style === "datetime") {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);
}

export function formatRelativeTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["week", 604_800_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];

  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return "just now";
}

/**
 * Human-readable reference codes. Grouped and uppercase so a support agent can
 * read one over the phone without ambiguity (no O/0 or I/1 collisions).
 */
const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReference(prefix: string): string {
  let body = "";
  for (let i = 0; i < 10; i += 1) {
    body += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  return `${prefix}-${body.slice(0, 5)}-${body.slice(5)}`;
}
