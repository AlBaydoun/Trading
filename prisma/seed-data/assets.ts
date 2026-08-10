import type { AssetKind } from "@prisma/client";

export interface AssetSeed {
  symbol: string;
  name: string;
  kind: AssetKind;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number | null;
  volume24h: number | null;
  exchange?: string;
  coingeckoId?: string;
  rank?: number;
  featured?: boolean;
}

/**
 * Baseline prices so the board is never empty on a cold install or when the
 * upstream provider is unreachable. Live values overwrite these on the first
 * successful refresh — treat everything here as indicative only.
 */
export const ASSET_SEEDS: AssetSeed[] = [
  // --- Crypto -------------------------------------------------------------
  { symbol: "BTC", name: "Bitcoin", kind: "CRYPTO", price: 67420, change24h: 1.84, change7d: 4.6, marketCap: 1_330_000_000_000, volume24h: 32_400_000_000, coingeckoId: "bitcoin", rank: 1, featured: true },
  { symbol: "ETH", name: "Ethereum", kind: "CRYPTO", price: 3285, change24h: 2.41, change7d: 6.1, marketCap: 395_000_000_000, volume24h: 18_900_000_000, coingeckoId: "ethereum", rank: 2, featured: true },
  { symbol: "USDT", name: "Tether", kind: "CRYPTO", price: 1.0, change24h: 0.01, change7d: 0.0, marketCap: 112_000_000_000, volume24h: 48_000_000_000, coingeckoId: "tether", rank: 3 },
  { symbol: "BNB", name: "BNB", kind: "CRYPTO", price: 592, change24h: -0.74, change7d: 2.2, marketCap: 87_000_000_000, volume24h: 1_800_000_000, coingeckoId: "binancecoin", rank: 4, featured: true },
  { symbol: "SOL", name: "Solana", kind: "CRYPTO", price: 164.2, change24h: 4.12, change7d: 11.4, marketCap: 76_000_000_000, volume24h: 3_100_000_000, coingeckoId: "solana", rank: 5, featured: true },
  { symbol: "XRP", name: "XRP", kind: "CRYPTO", price: 0.612, change24h: -1.26, change7d: -3.1, marketCap: 34_000_000_000, volume24h: 1_400_000_000, coingeckoId: "ripple", rank: 6 },
  { symbol: "ADA", name: "Cardano", kind: "CRYPTO", price: 0.452, change24h: 0.92, change7d: 1.8, marketCap: 16_000_000_000, volume24h: 420_000_000, coingeckoId: "cardano", rank: 8 },
  { symbol: "AVAX", name: "Avalanche", kind: "CRYPTO", price: 34.8, change24h: 3.05, change7d: 8.7, marketCap: 13_400_000_000, volume24h: 380_000_000, coingeckoId: "avalanche-2", rank: 10, featured: true },
  { symbol: "LINK", name: "Chainlink", kind: "CRYPTO", price: 16.4, change24h: 2.18, change7d: 5.4, marketCap: 9_800_000_000, volume24h: 410_000_000, coingeckoId: "chainlink", rank: 13 },
  { symbol: "DOT", name: "Polkadot", kind: "CRYPTO", price: 6.72, change24h: -0.48, change7d: 0.9, marketCap: 9_100_000_000, volume24h: 210_000_000, coingeckoId: "polkadot", rank: 14 },
  { symbol: "MATIC", name: "Polygon", kind: "CRYPTO", price: 0.684, change24h: 1.34, change7d: -2.2, marketCap: 6_400_000_000, volume24h: 290_000_000, coingeckoId: "matic-network", rank: 17 },
  { symbol: "LTC", name: "Litecoin", kind: "CRYPTO", price: 84.6, change24h: 0.61, change7d: 2.8, marketCap: 6_300_000_000, volume24h: 340_000_000, coingeckoId: "litecoin", rank: 18 },

  // --- Equities and ETFs ---------------------------------------------------
  { symbol: "AAPL", name: "Apple Inc.", kind: "EQUITY", price: 226.4, change24h: 0.82, change7d: 2.1, marketCap: 3_440_000_000_000, volume24h: 48_000_000, exchange: "NASDAQ", featured: true },
  { symbol: "MSFT", name: "Microsoft Corp.", kind: "EQUITY", price: 417.2, change24h: 1.14, change7d: 3.4, marketCap: 3_100_000_000_000, volume24h: 21_000_000, exchange: "NASDAQ", featured: true },
  { symbol: "NVDA", name: "NVIDIA Corp.", kind: "EQUITY", price: 124.8, change24h: 2.96, change7d: 7.8, marketCap: 3_060_000_000_000, volume24h: 310_000_000, exchange: "NASDAQ", featured: true },
  { symbol: "AMZN", name: "Amazon.com Inc.", kind: "EQUITY", price: 186.5, change24h: 0.44, change7d: 1.2, marketCap: 1_950_000_000_000, volume24h: 39_000_000, exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.", kind: "EQUITY", price: 168.9, change24h: -0.62, change7d: 0.8, marketCap: 2_070_000_000_000, volume24h: 26_000_000, exchange: "NASDAQ" },
  { symbol: "META", name: "Meta Platforms Inc.", kind: "EQUITY", price: 512.3, change24h: 1.72, change7d: 4.9, marketCap: 1_300_000_000_000, volume24h: 14_000_000, exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla Inc.", kind: "EQUITY", price: 219.6, change24h: -2.14, change7d: -5.3, marketCap: 700_000_000_000, volume24h: 92_000_000, exchange: "NASDAQ", featured: true },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", kind: "EQUITY", price: 212.7, change24h: 0.38, change7d: 1.6, marketCap: 610_000_000_000, volume24h: 8_400_000, exchange: "NYSE" },
  { symbol: "V", name: "Visa Inc.", kind: "EQUITY", price: 276.4, change24h: 0.21, change7d: 0.9, marketCap: 545_000_000_000, volume24h: 6_100_000, exchange: "NYSE" },
  { symbol: "BRK.B", name: "Berkshire Hathaway", kind: "EQUITY", price: 452.1, change24h: 0.15, change7d: 1.1, marketCap: 975_000_000_000, volume24h: 3_200_000, exchange: "NYSE" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", kind: "ETF", price: 558.3, change24h: 0.52, change7d: 1.9, marketCap: null, volume24h: 44_000_000, exchange: "NYSE ARCA", featured: true },
  { symbol: "QQQ", name: "Invesco QQQ Trust", kind: "ETF", price: 478.9, change24h: 0.94, change7d: 3.1, marketCap: null, volume24h: 31_000_000, exchange: "NASDAQ" },
];

/**
 * Builds a plausible 48-point sparkline that ends exactly at the current price
 * and is consistent with the quoted 7-day change.
 */
export function buildSparkline(
  price: number,
  change7dPct: number,
  seed: number,
): number[] {
  const points = 48;
  const start = price / (1 + change7dPct / 100);
  const series: number[] = [];

  let rng = seed || 1;
  const next = () => {
    rng = (rng * 1664525 + 1013904223) % 4294967296;
    return rng / 4294967296;
  };

  for (let i = 0; i < points; i += 1) {
    const t = i / (points - 1);
    const trend = start + (price - start) * t;
    // Noise fades out toward the end so the series lands on the real price.
    const noise = (next() - 0.5) * price * 0.012 * (1 - t * 0.85);
    series.push(Number((trend + noise).toFixed(price < 1 ? 6 : 2)));
  }

  series[points - 1] = price;
  return series;
}
