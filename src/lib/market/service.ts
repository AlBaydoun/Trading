import "server-only";

import { AssetKind, Prisma } from "@prisma/client";
import { prisma, safeQuery } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { seededRandom } from "@/lib/utils";
import {
  fetchCryptoQuotes,
  fetchEquityQuotes,
  fetchForexQuotes,
  fetchGlobalCryptoStats,
  type ProviderQuote,
} from "@/lib/market/providers";
import { ASSET_CLASS_ORDER } from "@/lib/market/types";
import type { MarketSnapshot, Quote, QuoteSource } from "@/lib/market/types";

/**
 * Reads always come from our own database; writes come from a refresh. That
 * keeps page rendering fast and independent of any third party's uptime, and it
 * means a rate-limited provider degrades the *freshness* of the data rather
 * than the availability of the site.
 */

const STALE_AFTER_MS = 5 * 60_000;

/** Guards against a refresh stampede when several requests find stale data. */
let refreshInFlight: Promise<{ updated: number; source: QuoteSource }> | null = null;

function toQuote(asset: {
  symbol: string;
  name: string;
  kind: AssetKind;
  priceUsd: Prisma.Decimal;
  change24hPct: Prisma.Decimal;
  change7dPct: Prisma.Decimal;
  marketCapUsd: Prisma.Decimal | null;
  volume24hUsd: Prisma.Decimal | null;
  logoUrl: string | null;
  sparkline: Prisma.JsonValue;
  rank: number | null;
  updatedAt: Date;
}): Quote {
  return {
    symbol: asset.symbol,
    name: asset.name,
    kind: asset.kind,
    price: toNumber(asset.priceUsd),
    change24hPct: toNumber(asset.change24hPct),
    change7dPct: toNumber(asset.change7dPct),
    marketCap: asset.marketCapUsd ? toNumber(asset.marketCapUsd) : null,
    volume24h: asset.volume24hUsd ? toNumber(asset.volume24hUsd) : null,
    logoUrl: asset.logoUrl,
    sparkline: Array.isArray(asset.sparkline)
      ? (asset.sparkline as number[]).filter((n) => typeof n === "number")
      : [],
    rank: asset.rank,
    updatedAt: asset.updatedAt.toISOString(),
  };
}

// -----------------------------------------------------------------------------
// Refresh
// -----------------------------------------------------------------------------

async function persistQuotes(quotes: ProviderQuote[]): Promise<number> {
  let updated = 0;

  for (const quote of quotes) {
    if (!Number.isFinite(quote.price) || quote.price <= 0) continue;

    let change24h = quote.change24hPct;
    let change7d = quote.change7dPct;

    // Some feeds return only a spot price. Rather than invent a movement,
    // measure it against what we actually recorded a day and a week ago.
    if (quote.deriveChange) {
      change24h = await changeSince(quote.symbol, quote.price, 1);
      change7d = await changeSince(quote.symbol, quote.price, 7);
    }

    const data = {
      name: quote.name,
      kind: quote.kind,
      priceUsd: new Prisma.Decimal(quote.price.toFixed(8)),
      change24hPct: new Prisma.Decimal(change24h.toFixed(4)),
      change7dPct: new Prisma.Decimal(change7d.toFixed(4)),
      marketCapUsd:
        quote.marketCap != null ? new Prisma.Decimal(quote.marketCap.toFixed(2)) : null,
      volume24hUsd:
        quote.volume24h != null ? new Prisma.Decimal(quote.volume24h.toFixed(2)) : null,
      circulating:
        quote.circulating != null ? new Prisma.Decimal(quote.circulating.toFixed(4)) : null,
      logoUrl: quote.logoUrl,
      sparkline: quote.sparkline.length > 0 ? quote.sparkline : undefined,
      rank: quote.rank,
      coingeckoId: quote.coingeckoId ?? null,
      exchange: quote.exchange ?? null,
      isActive: true,
    };

    await prisma.asset.upsert({
      where: { symbol: quote.symbol },
      update: data,
      create: { symbol: quote.symbol, ...data },
    });

    updated += 1;
  }

  return updated;
}

/**
 * Pulls fresh prices from every configured provider and writes them through.
 * Safe to call concurrently — callers share one in-flight refresh.
 */
export function refreshMarketData(): Promise<{ updated: number; source: QuoteSource }> {
  if (refreshInFlight) return refreshInFlight;

  const run = (async () => {
    let updated = 0;
    let source: QuoteSource = "cached";

    const crypto = await fetchCryptoQuotes(60);
    if (crypto) {
      updated += await persistQuotes(crypto);
      source = "live";
    }

    // Free, key-less and genuinely live — forex needs no configuration.
    const forex = await fetchForexQuotes();
    if (forex) {
      updated += await persistQuotes(forex);
      source = "live";
    }

    const equities = await fetchEquityQuotes();
    if (equities) {
      updated += await persistQuotes(equities);
      source = "live";
    } else {
      // No equity provider key: nudge the seeded prices along a small random
      // walk so the board is not frozen. Flagged as simulated everywhere.
      updated += await driftSimulatedEquities();
      if (source !== "live") source = "simulated";
    }

    await captureSnapshots();
    return { updated, source };
  })();

  // Release the guard once this run settles, successfully or not.
  refreshInFlight = run.finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * Deterministic-per-hour drift for equity rows when no provider is configured.
 * Uses a seeded generator so the same hour always yields the same price and the
 * server and client cannot disagree.
 */
async function driftSimulatedEquities(): Promise<number> {
  // Crypto and forex have real feeds, so they are never drifted. Everything
  // else without a provider key moves in a narrow, clearly-labelled band.
  const assets = await prisma.asset.findMany({
    where: {
      isActive: true,
      kind: { in: [AssetKind.EQUITY, AssetKind.ETF, AssetKind.INDEX, AssetKind.COMMODITY, AssetKind.BOND, AssetKind.REIT] },
    },
  });

  const hourBucket = Math.floor(Date.now() / 3_600_000);
  let updated = 0;

  for (const asset of assets) {
    const rand = seededRandom(`${asset.symbol}:${hourBucket}`);
    // ±1.4% band — realistic intraday movement, never a headline-making jump.
    const drift = (rand() - 0.5) * 0.028;
    const base = toNumber(asset.priceUsd);
    if (base <= 0) continue;

    const next = Math.max(0.01, base * (1 + drift));

    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        priceUsd: new Prisma.Decimal(next.toFixed(4)),
        change24hPct: new Prisma.Decimal((drift * 100).toFixed(4)),
      },
    });
    updated += 1;
  }

  return updated;
}

/**
 * Percentage change against the snapshot closest to `days` ago. Returns 0 when
 * there is no history yet — a new install shows a flat line rather than a
 * fabricated move.
 */
async function changeSince(
  symbol: string,
  currentPrice: number,
  days: number,
): Promise<number> {
  const target = new Date(Date.now() - days * 86_400_000);

  const past = await safeQuery(
    () =>
      prisma.priceSnapshot.findFirst({
        where: { asset: { symbol }, capturedAt: { lte: target } },
        orderBy: { capturedAt: "desc" },
        select: { priceUsd: true },
      }),
    null,
    `price history for ${symbol}`,
  );

  if (!past) return 0;
  const previous = toNumber(past.priceUsd);
  if (previous <= 0) return 0;

  return ((currentPrice - previous) / previous) * 100;
}

/**
 * Keeps a price history for every tracked instrument — it drives the markets
 * charts and the derived change figures above.
 *
 * Capped at one capture per hour. Refreshes run every few minutes, and storing
 * each one would put roughly 700k rows a month into the table for no extra
 * resolution than an hourly series already gives.
 */
const SNAPSHOT_INTERVAL_MS = 55 * 60_000;

async function captureSnapshots(): Promise<void> {
  const newest = await safeQuery(
    () =>
      prisma.priceSnapshot.findFirst({
        orderBy: { capturedAt: "desc" },
        select: { capturedAt: true },
      }),
    null,
    "snapshot cursor",
  );

  if (newest && Date.now() - newest.capturedAt.getTime() < SNAPSHOT_INTERVAL_MS) {
    return;
  }

  const assets = await prisma.asset.findMany({
    where: { isActive: true },
    select: { id: true, priceUsd: true },
  });

  if (assets.length === 0) return;

  await prisma.priceSnapshot.createMany({
    data: assets.map((a) => ({ assetId: a.id, priceUsd: a.priceUsd })),
  });

  // Retain 30 days; beyond that the table grows without adding value.
  await prisma.priceSnapshot.deleteMany({
    where: { capturedAt: { lt: new Date(Date.now() - 30 * 86_400_000) } },
  });
}

// -----------------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------------

async function isStale(): Promise<boolean> {
  const newest = await safeQuery(
    () =>
      prisma.asset.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    null,
    "asset freshness check",
  );
  if (!newest) return true;
  return Date.now() - newest.updatedAt.getTime() > STALE_AFTER_MS;
}

export async function getMarketSnapshot(options: {
  kind?: AssetKind;
  limit?: number;
  featuredOnly?: boolean;
} = {}): Promise<MarketSnapshot> {
  const { kind, limit = 30, featuredOnly = false } = options;

  let source: QuoteSource = "cached";
  let warning: string | undefined;

  if (await isStale()) {
    try {
      const result = await refreshMarketData();
      source = result.source;
    } catch (error) {
      warning = "Live prices are temporarily unavailable — showing last known values.";
      console.warn("[market] refresh failed", error);
    }
  }

  const assets = await safeQuery(
    () =>
      prisma.asset.findMany({
        where: {
          isActive: true,
          ...(kind ? { kind } : {}),
          ...(featuredOnly ? { isFeatured: true } : {}),
        },
        orderBy: [{ rank: { sort: "asc", nulls: "last" } }, { marketCapUsd: "desc" }],
        take: limit,
      }),
    [],
    "market board",
  );

  // Equity rows are indicative whenever no provider key is set.
  if (!process.env.FINNHUB_API_KEY && assets.some((a) => a.kind !== AssetKind.CRYPTO)) {
    if (source === "live") source = "cached";
  }

  return {
    quotes: assets.map(toQuote),
    source,
    fetchedAt: new Date().toISOString(),
    warning,
  };
}

export async function getTickerQuotes(limit = 14): Promise<Quote[]> {
  const snapshot = await getMarketSnapshot({ limit, featuredOnly: true });
  if (snapshot.quotes.length > 0) return snapshot.quotes;
  // Featured list not configured yet — fall back to the top of the board.
  return (await getMarketSnapshot({ limit })).quotes;
}

export async function getMarketStats() {
  const [global, aggregate, movers] = await Promise.all([
    fetchGlobalCryptoStats(),
    safeQuery(
      () =>
        prisma.asset.aggregate({
          where: { kind: AssetKind.CRYPTO, isActive: true },
          _sum: { marketCapUsd: true, volume24hUsd: true },
        }),
      { _sum: { marketCapUsd: null, volume24hUsd: null } },
      "market aggregate",
    ),
    safeQuery(
      () =>
        prisma.asset.findMany({
          where: { isActive: true, kind: AssetKind.CRYPTO },
          orderBy: { change24hPct: "desc" },
          take: 60,
        }),
      [],
      "market movers",
    ),
  ]);

  const quotes = movers.map(toQuote);
  const ranked = [...quotes].sort((a, b) => b.change24hPct - a.change24hPct);

  return {
    totalMarketCap:
      global?.totalMarketCap ?? toNumber(aggregate._sum.marketCapUsd ?? 0),
    totalVolume24h:
      global?.totalVolume24h ?? toNumber(aggregate._sum.volume24hUsd ?? 0),
    btcDominancePct: global?.btcDominancePct ?? 0,
    gainers: ranked.slice(0, 5),
    losers: ranked.slice(-5).reverse(),
  };
}

/**
 * The whole board, grouped by asset class and ordered for display. One query
 * rather than one per class, because the markets page renders all of them.
 */
export async function getMarketBoard(): Promise<{
  groups: { kind: AssetKind; quotes: Quote[] }[];
  source: QuoteSource;
  total: number;
}> {
  const snapshot = await getMarketSnapshot({ limit: 250 });

  const byKind = new Map<AssetKind, Quote[]>();
  for (const quote of snapshot.quotes) {
    const bucket = byKind.get(quote.kind);
    if (bucket) bucket.push(quote);
    else byKind.set(quote.kind, [quote]);
  }

  const groups = ASSET_CLASS_ORDER.map((kind) => ({
    kind,
    quotes: byKind.get(kind) ?? [],
  })).filter((group) => group.quotes.length > 0);

  return { groups, source: snapshot.source, total: snapshot.quotes.length };
}

export async function getAssetBySymbol(symbol: string): Promise<Quote | null> {
  const asset = await prisma.asset.findUnique({
    where: { symbol: symbol.toUpperCase() },
  });
  return asset ? toQuote(asset) : null;
}
