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
