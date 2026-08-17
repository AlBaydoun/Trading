import type { PayoutFrequency, RiskLevel } from "@prisma/client";

export interface PlanSeed {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  minimumAmount: string;
  maximumAmount: string | null;
  targetApyLow: string;
  targetApyHigh: string;
  managementFeePct: string;
  performanceFeePct: string;
  earlyExitFeePct: string;
  lockupDays: number;
  payoutFrequency: PayoutFrequency;
  riskLevel: RiskLevel;
  allocation: { label: string; percent: number; kind: string }[];
  highlights: string[];
  isFeatured: boolean;
  sortOrder: number;
}

export const PLAN_SEEDS: PlanSeed[] = [
  {
    slug: "stable-yield",
    name: "Stable Yield",
    tagline: "Dollar-denominated income from staking and lending",
    description:
      "Capital is deployed into over-collateralised lending markets, liquid staking positions and short-dated treasury exposure. The mandate targets a steady dollar return with minimal directional exposure to crypto prices. Positions are rebalanced weekly and collateral ratios are monitored continuously; the strategy will de-risk to cash rather than accept thinning collateral buffers.",
    minimumAmount: "500",
    maximumAmount: "250000",
    targetApyLow: "6",
    targetApyHigh: "9",
    managementFeePct: "1",
    performanceFeePct: "10",
    earlyExitFeePct: "0.5",
    lockupDays: 30,
    payoutFrequency: "MONTHLY",
    riskLevel: "LOW",
    allocation: [
      { label: "Stablecoin lending", percent: 40, kind: "CRYPTO" },
      { label: "Liquid staking (ETH, SOL)", percent: 22, kind: "CRYPTO" },
      { label: "Short-dated treasuries", percent: 26, kind: "BOND" },
      { label: "Cash buffer", percent: 12, kind: "FOREX" },
    ],
    highlights: [
      "30-day lock-up, then withdraw any time",
      "Monthly income paid to your cash balance",
      "No directional bet on crypto prices",
      "Daily collateral monitoring with automatic de-risking",
    ],
    isFeatured: false,
    sortOrder: 1,
  },
  {
    slug: "balanced-index",
    name: "Balanced Index",
    tagline: "One allocation across global equities and major digital assets",
    description:
      "A single diversified allocation split between broad equity index exposure and the large-cap end of the digital asset market. Rebalanced monthly back to target weights, which mechanically trims what has run and adds to what has lagged. This is the default choice for investors who want one position rather than a portfolio to manage.",
    minimumAmount: "2500",
    maximumAmount: "1000000",
    targetApyLow: "10",
    targetApyHigh: "16",
    managementFeePct: "1.25",
    performanceFeePct: "15",
    earlyExitFeePct: "1",
    lockupDays: 90,
    payoutFrequency: "QUARTERLY",
    riskLevel: "MODERATE",
    allocation: [
      { label: "US large-cap equities", percent: 30, kind: "EQUITY" },
      { label: "International equities", percent: 14, kind: "EQUITY" },
      { label: "Government bonds", percent: 14, kind: "BOND" },
      { label: "Bitcoin", percent: 18, kind: "CRYPTO" },
      { label: "Ethereum", percent: 10, kind: "CRYPTO" },
      { label: "Gold", percent: 6, kind: "COMMODITY" },
      { label: "Stablecoin yield", percent: 8, kind: "CRYPTO" },
    ],
    highlights: [
      "Monthly rebalancing back to target weights",
      "Equity and crypto exposure in a single position",
      "Quarterly distributions or automatic compounding",
      "Full position-level transparency in your dashboard",
    ],
    isFeatured: true,
    sortOrder: 2,
  },
  {
    slug: "digital-assets-growth",
    name: "Digital Assets Growth",
    tagline: "Concentrated exposure to the strongest crypto networks",
    description:
      "A high-conviction allocation to Bitcoin, Ethereum and a short list of layer-one and infrastructure networks that clear a liquidity and development-activity screen. The mandate accepts meaningful drawdowns in exchange for asymmetric upside, and is only appropriate for investors who can leave the capital untouched for the full lock-up.",
    minimumAmount: "10000",
    maximumAmount: null,
    targetApyLow: "18",
    targetApyHigh: "34",
    managementFeePct: "2",
    performanceFeePct: "20",
    earlyExitFeePct: "2",
    lockupDays: 180,
    payoutFrequency: "ON_MATURITY",
    riskLevel: "HIGH",
    allocation: [
      { label: "Bitcoin", percent: 40, kind: "CRYPTO" },
      { label: "Ethereum", percent: 25, kind: "CRYPTO" },
      { label: "Layer-one networks", percent: 20, kind: "CRYPTO" },
      { label: "Infrastructure and DePIN", percent: 10, kind: "CRYPTO" },
      { label: "Cash buffer", percent: 5, kind: "FOREX" },
    ],
    highlights: [
      "180-day horizon, built for a full market cycle",
      "Screened on liquidity, not on narrative",
      "Assets held with a qualified custodian",
      "Drawdowns of 40% or more are expected, not exceptional",
    ],
    isFeatured: true,
    sortOrder: 3,
  },
  {
    slug: "equity-momentum",
    name: "Equity Momentum",
    tagline: "Systematic exposure to trending US large caps",
    description:
      "A rules-based long-only equity strategy that ranks the S&P 500 on twelve-month trailing momentum with a one-month reversal filter, holds the top decile and rebalances monthly. No discretionary overrides. The rules are published in your dashboard and the reconstitution history is auditable at every rebalance date.",
    minimumAmount: "5000",
    maximumAmount: "2000000",
    targetApyLow: "12",
    targetApyHigh: "22",
    managementFeePct: "1.5",
    performanceFeePct: "15",
    earlyExitFeePct: "1",
    lockupDays: 90,
    payoutFrequency: "QUARTERLY",
    riskLevel: "MODERATE",
    allocation: [
      { label: "Technology", percent: 38, kind: "EQUITY" },
      { label: "Financials", percent: 18, kind: "EQUITY" },
      { label: "Healthcare", percent: 14, kind: "EQUITY" },
      { label: "Consumer discretionary", percent: 12, kind: "EQUITY" },
      { label: "Industrials and energy", percent: 12, kind: "EQUITY" },
      { label: "Cash", percent: 6, kind: "FOREX" },
    ],
    highlights: [
      "Published, unchanging rule set — no discretionary calls",
      "Monthly reconstitution with full audit trail",
      "Sector caps prevent single-theme concentration",
      "Quarterly distributions",
    ],
    isFeatured: false,
    sortOrder: 6,
  },
  {
    slug: "quant-alpha",
    name: "Quant Alpha",
    tagline: "Market-neutral basis and funding-rate capture",
    description:
      "A market-neutral book that harvests the basis between spot and perpetual futures, plus funding-rate dislocations across venues. Gross exposure is hedged so returns are largely uncorrelated with market direction. Capacity is limited by venue depth, so the strategy is capped and allocations are accepted in cohorts.",
    minimumAmount: "50000",
    maximumAmount: "5000000",
    targetApyLow: "20",
    targetApyHigh: "38",
    managementFeePct: "2",
    performanceFeePct: "25",
    earlyExitFeePct: "3",
    lockupDays: 365,
    payoutFrequency: "ON_MATURITY",
    riskLevel: "VERY_HIGH",
    allocation: [
      { label: "Cash-and-carry basis", percent: 45, kind: "CRYPTO" },
      { label: "Funding-rate arbitrage", percent: 30, kind: "CRYPTO" },
      { label: "Cross-venue spreads", percent: 15, kind: "CRYPTO" },
      { label: "Margin buffer", percent: 10, kind: "FOREX" },
    ],
    highlights: [
      "Returns largely uncorrelated with market direction",
      "Capacity-capped — allocations open in cohorts",
      "Counterparty exposure spread across five venues",
      "Qualified investors only; twelve-month lock-up",
    ],
    isFeatured: false,
    sortOrder: 7,
  },
  {
    slug: "global-macro",
    name: "Global Macro",
    tagline: "Currencies, rates and commodities, positioned on the economic cycle",
    description:
      "A discretionary macro book expressing views across foreign exchange, government bonds and commodities. Positions are sized to the conviction behind them and to what the position would cost if the view is wrong, not to a fixed weight. The mandate can be net long or net short any of its markets, which is what allows it to make money in conditions where a long-only portfolio cannot.",
    minimumAmount: "25000",
    maximumAmount: "3000000",
    targetApyLow: "14",
    targetApyHigh: "26",
    managementFeePct: "1.75",
    performanceFeePct: "20",
    earlyExitFeePct: "1.5",
    lockupDays: 180,
    payoutFrequency: "QUARTERLY",
    riskLevel: "HIGH",
    allocation: [
      { label: "G10 currencies", percent: 30, kind: "FOREX" },
      { label: "Government bonds", percent: 25, kind: "BOND" },
      { label: "Energy and metals", percent: 22, kind: "COMMODITY" },
      { label: "Equity index futures", percent: 15, kind: "INDEX" },
      { label: "Cash and margin", percent: 8, kind: "FOREX" },
    ],
    highlights: [
      "Can be long or short — not dependent on markets rising",
      "Trades currencies, rates and commodities in one mandate",
      "Position sizing driven by downside, not by target weight",
      "Quarterly distributions",
    ],
    isFeatured: true,
    sortOrder: 4,
  },
  {
    slug: "real-assets",
    name: "Real Assets Income",
    tagline: "Property, infrastructure and precious metals for inflation-aware income",
    description:
      "Listed real estate, infrastructure and a standing allocation to precious metals. The mandate is built for investors who want income with some protection against currency debasement: rents and tolls tend to reset with inflation, and metals have historically held purchasing power when currencies have not. Slower moving than equities, and deliberately so.",
    minimumAmount: "5000",
    maximumAmount: "2000000",
    targetApyLow: "7",
    targetApyHigh: "12",
    managementFeePct: "1.25",
    performanceFeePct: "12",
    earlyExitFeePct: "1",
    lockupDays: 90,
    payoutFrequency: "QUARTERLY",
    riskLevel: "MODERATE",
    allocation: [
      { label: "Listed property (REITs)", percent: 38, kind: "REIT" },
      { label: "Infrastructure equities", percent: 24, kind: "EQUITY" },
      { label: "Gold and silver", percent: 20, kind: "COMMODITY" },
      { label: "Inflation-linked bonds", percent: 13, kind: "BOND" },
      { label: "Cash", percent: 5, kind: "FOREX" },
    ],
    highlights: [
      "Income from rents, tolls and coupons rather than price appreciation",
      "Hard-asset allocation as a currency hedge",
      "Lower correlation to technology-heavy equity indices",
      "Quarterly distributions",
    ],
    isFeatured: false,
    sortOrder: 5,
  },
  {
    slug: "all-weather",
    name: "All-Weather Multi-Asset",
    tagline: "Every asset class we cover, balanced by risk rather than by cash",
    description:
      "The widest mandate on the platform: equities, bonds, commodities, currencies, listed property and digital assets in a single allocation. Weights are set by each sleeve's contribution to total portfolio risk rather than by the dollars in it, so a volatile 5% crypto position carries a similar risk budget to a much larger bond position. Rebalanced monthly back to target risk.",
    minimumAmount: "10000",
    maximumAmount: null,
    targetApyLow: "9",
    targetApyHigh: "15",
    managementFeePct: "1.5",
    performanceFeePct: "15",
    earlyExitFeePct: "1",
    lockupDays: 90,
    payoutFrequency: "QUARTERLY",
    riskLevel: "MODERATE",
    allocation: [
      { label: "Global equities", percent: 30, kind: "EQUITY" },
      { label: "Government and corporate bonds", percent: 24, kind: "BOND" },
      { label: "Commodities", percent: 14, kind: "COMMODITY" },
      { label: "Listed property", percent: 12, kind: "REIT" },
      { label: "Digital assets", percent: 10, kind: "CRYPTO" },
      { label: "Currency overlay and cash", percent: 10, kind: "FOREX" },
    ],
    highlights: [
      "Six asset classes in one position",
      "Weighted by risk contribution, not by dollar amount",
      "Built to hold through a full cycle, not to time one",
      "Monthly rebalancing back to target risk",
    ],
    isFeatured: true,
    sortOrder: 3,
  },
];
