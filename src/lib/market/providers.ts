import "server-only";

import { AssetKind } from "@prisma/client";

/**
 * Upstream market-data adapters.
 *
 * Every function here returns `null` rather than throwing when the provider is
 * unavailable or unconfigured. Callers fall back to the last value stored in
 * our own database, so a rate-limited third party never takes the site down.
 */

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const FETCH_TIMEOUT_MS = 8_000;

export interface ProviderQuote {
  symbol: string;
  name: string;
  kind: AssetKind;
  price: number;
  change24hPct: number;
  change7dPct: number;
  marketCap: number | null;
  volume24h: number | null;
  circulating: number | null;
  logoUrl: string | null;
  sparkline: number[];
  rank: number | null;
  coingeckoId?: string;
  exchange?: string;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit & { revalidate?: number } = {},
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const { revalidate = 60, ...rest } = init;
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: { accept: "application/json", ...(rest.headers ?? {}) },
      next: { revalidate },
    });

    if (!response.ok) {
      console.warn(`[market] ${url} → HTTP ${response.status}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[market] ${url} failed: ${reason}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// -----------------------------------------------------------------------------
// Crypto — CoinGecko
// -----------------------------------------------------------------------------

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  circulating_supply: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  sparkline_in_7d?: { price: number[] };
}

/**
 * The public tier allows roughly 10 requests per minute without a key, which is
 * ample: we refresh on a schedule and serve everything else from our database.
 */
export async function fetchCryptoQuotes(
  limit = 50,
): Promise<ProviderQuote[] | null> {
  const params = new URLSearchParams({
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: String(Math.min(limit, 250)),
    page: "1",
    sparkline: "true",
    price_change_percentage: "24h,7d",
  });

  const key = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = {};
  if (key) headers["x-cg-demo-api-key"] = key;

  const data = await fetchJson<CoinGeckoMarket[]>(
    `${COINGECKO_BASE}/coins/markets?${params}`,
    { headers, revalidate: 120 },
  );

  if (!data || !Array.isArray(data)) return null;

  return data.map((coin) => ({
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    kind: AssetKind.CRYPTO,
    price: coin.current_price ?? 0,
    change24hPct: coin.price_change_percentage_24h_in_currency ?? 0,
    change7dPct: coin.price_change_percentage_7d_in_currency ?? 0,
    marketCap: coin.market_cap,
    volume24h: coin.total_volume,
    circulating: coin.circulating_supply,
    logoUrl: coin.image ?? null,
    // 7 days of hourly closes is far more than a 40px sparkline needs.
    sparkline: downsample(coin.sparkline_in_7d?.price ?? [], 48),
    rank: coin.market_cap_rank,
    coingeckoId: coin.id,
  }));
}

interface CoinGeckoGlobal {
  data: {
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
  };
}

export async function fetchGlobalCryptoStats() {
  const data = await fetchJson<CoinGeckoGlobal>(`${COINGECKO_BASE}/global`, {
    revalidate: 300,
  });
  if (!data?.data) return null;

  return {
    totalMarketCap: data.data.total_market_cap?.usd ?? 0,
    totalVolume24h: data.data.total_volume?.usd ?? 0,
    btcDominancePct: data.data.market_cap_percentage?.btc ?? 0,
  };
}

// -----------------------------------------------------------------------------
// Equities — Finnhub (optional)
// -----------------------------------------------------------------------------

interface FinnhubQuote {
  c: number; // current
  d: number; // change
  dp: number; // change percent
  pc: number; // previous close
}

export const TRACKED_EQUITIES: {
  symbol: string;
  name: string;
  exchange: string;
  kind: AssetKind;
}[] = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", kind: AssetKind.EQUITY },
  { symbol: "MSFT", name: "Microsoft Corp.", exchange: "NASDAQ", kind: AssetKind.EQUITY },
  { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ", kind: AssetKind.EQUITY },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", kind: AssetKind.EQUITY },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", kind: AssetKind.EQUITY },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", kind: AssetKind.EQUITY },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", kind: AssetKind.EQUITY },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", kind: AssetKind.EQUITY },
  { symbol: "V", name: "Visa Inc.", exchange: "NYSE", kind: AssetKind.EQUITY },
  { symbol: "BRK.B", name: "Berkshire Hathaway", exchange: "NYSE", kind: AssetKind.EQUITY },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", exchange: "NYSE ARCA", kind: AssetKind.ETF },
  { symbol: "QQQ", name: "Invesco QQQ Trust", exchange: "NASDAQ", kind: AssetKind.ETF },
];

export async function fetchEquityQuotes(): Promise<ProviderQuote[] | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;

  const results = await Promise.all(
    TRACKED_EQUITIES.map(async (equity): Promise<ProviderQuote | null> => {
      const quote = await fetchJson<FinnhubQuote>(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(equity.symbol)}&token=${key}`,
        { revalidate: 120 },
      );
      if (!quote || typeof quote.c !== "number" || quote.c === 0) return null;

      return {
        symbol: equity.symbol,
        name: equity.name,
        kind: equity.kind,
        price: quote.c,
        change24hPct: quote.dp ?? 0,
        change7dPct: 0,
        marketCap: null,
        volume24h: null,
        circulating: null,
        logoUrl: null,
        sparkline: [],
        rank: null,
        exchange: equity.exchange,
      } satisfies ProviderQuote;
    }),
  );

  const quotes = results.filter((q): q is ProviderQuote => q !== null);
  return quotes.length > 0 ? quotes : null;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Evenly thins a series down to `target` points, always keeping the last one. */
export function downsample(series: number[], target: number): number[] {
  if (series.length <= target) return series.map((n) => round(n));
  const step = series.length / target;
  const out: number[] = [];
  for (let i = 0; i < target; i += 1) {
    out.push(round(series[Math.floor(i * step)] ?? 0));
  }
  out[out.length - 1] = round(series[series.length - 1] ?? 0);
  return out;
}

function round(value: number): number {
  const abs = Math.abs(value);
  if (abs >= 1000) return Math.round(value * 100) / 100;
  if (abs >= 1) return Math.round(value * 10000) / 10000;
  return Math.round(value * 1e8) / 1e8;
}
