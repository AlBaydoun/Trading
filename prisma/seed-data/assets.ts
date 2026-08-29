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

  // --- Foreign exchange -----------------------------------------------------
  // Quoted the way a dealer quotes them: EUR/USD is dollars per euro, USD/JPY
  // is yen per dollar. Live rates overwrite these on the first refresh.
  { symbol: "EURUSD", name: "Euro / US Dollar", kind: "FOREX", price: 1.0876, change24h: 0.12, change7d: -0.34, marketCap: null, volume24h: null, featured: true },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", kind: "FOREX", price: 1.2712, change24h: -0.08, change7d: 0.41, marketCap: null, volume24h: null },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", kind: "FOREX", price: 151.42, change24h: 0.24, change7d: 1.12, marketCap: null, volume24h: null, featured: true },
  { symbol: "USDCHF", name: "US Dollar / Swiss Franc", kind: "FOREX", price: 0.8842, change24h: -0.15, change7d: -0.22, marketCap: null, volume24h: null },
  { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", kind: "FOREX", price: 0.6584, change24h: 0.31, change7d: 0.86, marketCap: null, volume24h: null },
  { symbol: "USDCAD", name: "US Dollar / Canadian Dollar", kind: "FOREX", price: 1.3588, change24h: -0.11, change7d: -0.48, marketCap: null, volume24h: null },
  { symbol: "NZDUSD", name: "New Zealand Dollar / US Dollar", kind: "FOREX", price: 0.6012, change24h: 0.19, change7d: 0.52, marketCap: null, volume24h: null },
  { symbol: "USDCNY", name: "US Dollar / Chinese Yuan", kind: "FOREX", price: 7.2364, change24h: 0.04, change7d: 0.18, marketCap: null, volume24h: null },

  // --- Commodities ----------------------------------------------------------
  { symbol: "XAUUSD", name: "Gold", kind: "COMMODITY", price: 2338.4, change24h: 0.62, change7d: 2.14, marketCap: null, volume24h: null, featured: true },
  { symbol: "XAGUSD", name: "Silver", kind: "COMMODITY", price: 27.42, change24h: 1.08, change7d: 3.65, marketCap: null, volume24h: null },
  { symbol: "XPTUSD", name: "Platinum", kind: "COMMODITY", price: 964.5, change24h: -0.34, change7d: 1.22, marketCap: null, volume24h: null },
  { symbol: "WTI", name: "Crude Oil (WTI)", kind: "COMMODITY", price: 78.62, change24h: -1.24, change7d: -2.86, marketCap: null, volume24h: null, featured: true },
  { symbol: "BRENT", name: "Crude Oil (Brent)", kind: "COMMODITY", price: 82.94, change24h: -1.06, change7d: -2.41, marketCap: null, volume24h: null },
  { symbol: "NATGAS", name: "Natural Gas", kind: "COMMODITY", price: 2.184, change24h: 2.42, change7d: -4.18, marketCap: null, volume24h: null },
  { symbol: "COPPER", name: "Copper", kind: "COMMODITY", price: 4.286, change24h: 0.74, change7d: 1.92, marketCap: null, volume24h: null },
  { symbol: "WHEAT", name: "Wheat", kind: "COMMODITY", price: 594.25, change24h: -0.42, change7d: 0.88, marketCap: null, volume24h: null },

  // --- Indices --------------------------------------------------------------
  { symbol: "SPX", name: "S&P 500", kind: "INDEX", price: 5486.2, change24h: 0.48, change7d: 1.74, marketCap: null, volume24h: null, exchange: "CBOE", featured: true },
  { symbol: "NDX", name: "Nasdaq 100", kind: "INDEX", price: 19642.8, change24h: 0.86, change7d: 2.92, marketCap: null, volume24h: null, exchange: "NASDAQ", featured: true },
  { symbol: "DJI", name: "Dow Jones Industrial Average", kind: "INDEX", price: 39284.6, change24h: 0.22, change7d: 0.94, marketCap: null, volume24h: null, exchange: "NYSE" },
  { symbol: "UKX", name: "FTSE 100", kind: "INDEX", price: 8214.4, change24h: 0.16, change7d: 0.62, marketCap: null, volume24h: null, exchange: "LSE" },
  { symbol: "DAX", name: "DAX 40", kind: "INDEX", price: 18426.1, change24h: 0.34, change7d: 1.18, marketCap: null, volume24h: null, exchange: "XETRA" },
  { symbol: "NKY", name: "Nikkei 225", kind: "INDEX", price: 39104.5, change24h: -0.52, change7d: 1.46, marketCap: null, volume24h: null, exchange: "TSE" },
  { symbol: "VIX", name: "CBOE Volatility Index", kind: "INDEX", price: 13.24, change24h: -2.86, change7d: -6.42, marketCap: null, volume24h: null, exchange: "CBOE" },

  // --- Fixed income ---------------------------------------------------------
  // Priced as yield in percent — the convention the desk quotes them in.
  { symbol: "US10Y", name: "US 10-Year Treasury Yield", kind: "BOND", price: 4.284, change24h: -0.42, change7d: -1.24, marketCap: null, volume24h: null, featured: true },
  { symbol: "US02Y", name: "US 2-Year Treasury Yield", kind: "BOND", price: 4.706, change24h: -0.28, change7d: -0.92, marketCap: null, volume24h: null },
  { symbol: "US30Y", name: "US 30-Year Treasury Yield", kind: "BOND", price: 4.412, change24h: -0.36, change7d: -1.08, marketCap: null, volume24h: null },
  { symbol: "DE10Y", name: "German 10-Year Bund Yield", kind: "BOND", price: 2.462, change24h: -0.18, change7d: -0.64, marketCap: null, volume24h: null },
  { symbol: "GB10Y", name: "UK 10-Year Gilt Yield", kind: "BOND", price: 4.128, change24h: -0.24, change7d: -0.86, marketCap: null, volume24h: null },
  { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", kind: "BOND", price: 92.84, change24h: 0.44, change7d: 1.28, marketCap: null, volume24h: 24_000_000, exchange: "NASDAQ" },

  // --- Real estate ----------------------------------------------------------
  { symbol: "VNQ", name: "Vanguard Real Estate ETF", kind: "REIT", price: 86.42, change24h: 0.38, change7d: 1.06, marketCap: null, volume24h: 4_200_000, exchange: "NYSE ARCA", featured: true },
  { symbol: "PLD", name: "Prologis Inc.", kind: "REIT", price: 124.68, change24h: 0.52, change7d: 1.84, marketCap: 115_000_000_000, volume24h: 3_100_000, exchange: "NYSE" },
  { symbol: "AMT", name: "American Tower Corp.", kind: "REIT", price: 196.24, change24h: -0.28, change7d: 0.42, marketCap: 91_000_000_000, volume24h: 2_400_000, exchange: "NYSE" },
  { symbol: "EQIX", name: "Equinix Inc.", kind: "REIT", price: 742.6, change24h: 0.66, change7d: 2.12, marketCap: 70_000_000_000, volume24h: 620_000, exchange: "NASDAQ" },
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
