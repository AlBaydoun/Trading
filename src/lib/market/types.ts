import type { AssetKind } from "@prisma/client";

/**
 * The shape every market surface consumes. Deliberately plain (numbers, not
 * Decimals) because these objects cross into client components.
 */
export interface Quote {
  symbol: string;
  name: string;
  kind: AssetKind;
  price: number;
  change24hPct: number;
  change7dPct: number;
  marketCap: number | null;
  volume24h: number | null;
  logoUrl: string | null;
  sparkline: number[];
  rank: number | null;
  updatedAt: string;
}

/**
 * Where a quote came from. Rendered in the UI so nobody mistakes an indicative
 * price for an executable one.
 *   live      — fetched from the upstream provider on this request cycle
 *   cached    — last good value stored in our database
 *   simulated — derived from a seeded base price because no provider key is
 *               configured. Never present these as tradeable.
 */
export type QuoteSource = "live" | "cached" | "simulated";

export interface MarketSnapshot {
  quotes: Quote[];
  source: QuoteSource;
  fetchedAt: string;
  /** Present when the upstream call failed and we fell back. */
  warning?: string;
}

export interface MarketStats {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominancePct: number;
  gainers: Quote[];
  losers: Quote[];
}

/**
 * Presentation metadata for each asset class. Kept beside the types so the
 * markets board, the ticker and the plan allocations all label a class
 * identically — "Fixed income" never becomes "Bonds" on one screen and
 * "Treasuries" on another.
 *
 * `quote` describes what the price column actually means, because it is not the
 * same thing across classes: a bond row is a yield in percent, an FX row is one
 * currency priced in another, and an index row is a level rather than a price
 * you could pay.
 */
export const ASSET_CLASSES = {
  CRYPTO: {
    label: "Cryptocurrency",
    short: "Crypto",
    blurb: "Digital assets, priced continuously and traded every day of the year.",
    quote: "US dollars per unit",
    accent: "brand",
  },
  EQUITY: {
    label: "Equities",
    short: "Stocks",
    blurb: "Shares in listed companies across US and international exchanges.",
    quote: "US dollars per share",
    accent: "mint",
  },
  ETF: {
    label: "Funds and ETFs",
    short: "Funds",
    blurb: "Exchange-traded funds giving one-trade exposure to a whole basket.",
    quote: "US dollars per share",
    accent: "mint",
  },
  INDEX: {
    label: "Indices",
    short: "Indices",
    blurb: "Benchmark levels for the world's major equity markets.",
    quote: "Index level, not a tradeable price",
    accent: "violet",
  },
  COMMODITY: {
    label: "Commodities",
    short: "Commodities",
    blurb: "Metals, energy and agriculture — the real assets behind the economy.",
    quote: "US dollars per contract unit",
    accent: "gold",
  },
  FOREX: {
    label: "Foreign exchange",
    short: "Forex",
    blurb: "Major currency pairs, quoted the way a dealer quotes them.",
    quote: "Units of the second currency per one of the first",
    accent: "brand",
  },
  BOND: {
    label: "Fixed income",
    short: "Bonds",
    blurb: "Government yields and bond funds — the anchor in a diversified book.",
    quote: "Yield in percent, except fund rows priced per share",
    accent: "violet",
  },
  REIT: {
    label: "Real estate",
    short: "Property",
    blurb: "Listed property trusts: warehouses, data centres and towers.",
    quote: "US dollars per share",
    accent: "gold",
  },
} as const satisfies Record<
  AssetKind,
  { label: string; short: string; blurb: string; quote: string; accent: string }
>;

/** Display order on the markets board — most-traded first. */
export const ASSET_CLASS_ORDER: AssetKind[] = [
  "CRYPTO",
  "EQUITY",
  "FOREX",
  "COMMODITY",
  "INDEX",
  "BOND",
  "REIT",
  "ETF",
];

export function assetClass(kind: AssetKind) {
  return ASSET_CLASSES[kind];
}
