import type { Metadata } from "next";
import { AssetKind } from "@prisma/client";
import { getMarketSnapshot, getMarketStats } from "@/lib/market/service";
import { formatPrice, formatCompactMoney } from "@/lib/money";
import { buildMetadata, JsonLd, breadcrumbSchema } from "@/lib/seo";
import { Section, SectionHeading } from "@/components/marketing/section";
import {
  Badge,
  Delta,
  Panel,
  PanelHeader,
  Stat,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { Sparkline } from "@/components/ui/sparkline";
import { Reveal } from "@/components/motion/reveal";
import type { Quote } from "@/lib/market/types";

export const metadata: Metadata = buildMetadata({
  title: "Live Crypto & Stock Market Prices",
  description:
    "Live prices, 24-hour and 7-day moves, market capitalisation and volume across major cryptocurrencies, US equities and ETFs — the same board the Axiom portfolio desk works from.",
  path: "/markets",
  keywords: [
    "live crypto prices",
    "bitcoin price",
    "stock market prices",
    "crypto market cap",
    "market movers today",
  ],
});

// Prices go stale fast; a five-minute window keeps the page cheap to serve
// while never showing anything materially out of date.
export const revalidate = 300;

export default async function MarketsPage() {
  const [crypto, equities, stats] = await Promise.all([
    getMarketSnapshot({ kind: AssetKind.CRYPTO, limit: 30 }),
    getMarketSnapshot({ limit: 20 }),
    getMarketStats(),
  ]);

  const equityQuotes = equities.quotes.filter((q) => q.kind !== AssetKind.CRYPTO);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Markets", path: "/markets" },
        ])}
      />

      <Section className="pt-36 md:pt-44">
        <SectionHeading
          eyebrow="Market board"
          title="What the desk is looking at."
          description="Prices update continuously from our market data providers. They are indicative and for information only — they are not dealing quotes, and Axiom does not offer direct trading."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Crypto market cap"
            value={formatCompactMoney(stats.totalMarketCap)}
            sub="All tracked digital assets"
          />
          <Stat
            label="24h volume"
            value={formatCompactMoney(stats.totalVolume24h)}
            sub="Across all venues"
          />
          <Stat
            label="BTC dominance"
            value={`${stats.btcDominancePct.toFixed(1)}%`}
            sub="Share of total market cap"
            tone="brand"
          />
          <Stat
            label="Assets tracked"
            value={crypto.quotes.length + equityQuotes.length}
            sub="Crypto, equities and ETFs"
          />
        </div>

        {/* --------------------------------------------------- movers --- */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <MoversPanel title="Top gainers · 24h" quotes={stats.gainers} positive />
          <MoversPanel title="Top decliners · 24h" quotes={stats.losers} />
        </div>
      </Section>

      <Section className="border-y border-line bg-abyss pt-0 md:pt-0">
        <Reveal>
          <Panel>
            <PanelHeader
              title="Cryptocurrencies"
              description="Ranked by market capitalisation."
              action={
                <Badge tone={crypto.source === "live" ? "mint" : "outline"} dot>
                  {crypto.source === "live" ? "Live" : "Cached"}
                </Badge>
              }
            />
            <QuoteTable quotes={crypto.quotes} showRank />
          </Panel>
        </Reveal>

        <Reveal className="mt-8">
          <Panel>
            <PanelHeader
              title="Equities and ETFs"
              description="US large caps and index trackers referenced by the equity mandates."
              action={
                <Badge tone="outline">
                  {process.env.FINNHUB_API_KEY ? "Delayed" : "Indicative"}
                </Badge>
              }
            />
            <QuoteTable quotes={equityQuotes} />
            {!process.env.FINNHUB_API_KEY && (
              <p className="border-t border-line px-5 py-3 text-[12px] text-ink-faint">
                No equity data provider is configured, so these rows are derived
                from baseline prices and move within a narrow simulated band. Add
                a <code className="font-mono text-ink-muted">FINNHUB_API_KEY</code>{" "}
                to serve real quotes.
              </p>
            )}
          </Panel>
        </Reveal>
      </Section>

      <Section>
        <div className="panel px-6 py-8 md:px-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            About this data
          </h2>
          <div className="mt-4 grid gap-6 text-[14px] leading-relaxed text-ink-muted md:grid-cols-3">
            <p>
              Cryptocurrency prices come from CoinGecko&apos;s aggregate feed and
              refresh roughly every two minutes. They represent a volume-weighted
              average across venues, not any single exchange&apos;s book.
            </p>
            <p>
              Equity prices are end-of-interval quotes and may be delayed by up
              to fifteen minutes depending on the exchange. They are not suitable
              for timing a trade.
            </p>
            <p>
              Nothing on this page is an offer, a recommendation or a dealing
              quote. Axiom manages mandates; it does not operate an exchange or
              accept individual trade instructions.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}

function MoversPanel({
  title,
  quotes,
  positive = false,
}: {
  title: string;
  quotes: Quote[];
  positive?: boolean;
}) {
  return (
    <Panel>
      <PanelHeader title={title} />
      <ul className="divide-y divide-line/70">
        {quotes.map((quote) => (
          <li
            key={quote.symbol}
            className="flex items-center justify-between gap-4 px-5 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-bright bg-surface-2 font-mono text-[10px] font-semibold text-ink-muted">
                {quote.symbol.slice(0, 3)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium text-ink">
                  {quote.name}
                </span>
                <span className="block font-mono text-[11px] text-ink-faint">
                  {quote.symbol}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[13px] tabular-nums text-ink-muted">
                {formatPrice(quote.price)}
              </span>
              <Delta value={quote.change24hPct} className="w-20 justify-end" />
              <Sparkline
                data={quote.sparkline}
                id={`mover-${quote.symbol}`}
                className="hidden h-7 w-16 sm:block"
                positive={positive}
                fill={false}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function QuoteTable({
  quotes,
  showRank = false,
}: {
  quotes: Quote[];
  showRank?: boolean;
}) {
  if (quotes.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-ink-faint">
        No instruments to display.
      </p>
    );
  }

  return (
    <Table className="min-w-[820px]">
      <thead>
        <tr>
          {showRank && <Th align="center">#</Th>}
          <Th>Asset</Th>
          <Th align="right">Price</Th>
          <Th align="right">24h</Th>
          <Th align="right">7d</Th>
          <Th align="right" className="hidden lg:table-cell">Market cap</Th>
          <Th align="right" className="hidden lg:table-cell">Volume 24h</Th>
          <Th align="right">7-day trend</Th>
        </tr>
      </thead>
      <tbody>
        {quotes.map((quote, index) => (
          <tr
            key={quote.symbol}
            id={quote.symbol}
            className="scroll-mt-24 transition-colors target:bg-brand/8 hover:bg-surface-2/60"
          >
            {showRank && (
              <Td align="center" mono className="text-ink-faint">
                {quote.rank ?? index + 1}
              </Td>
            )}
            <Td>
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-bright bg-surface-2 font-mono text-[10px] font-semibold text-ink-muted">
                  {quote.symbol.slice(0, 3)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">
                    {quote.name}
                  </span>
                  <span className="block font-mono text-[11px] text-ink-faint">
                    {quote.symbol}
                  </span>
                </span>
              </div>
            </Td>
            <Td align="right" mono>{formatPrice(quote.price)}</Td>
            <Td align="right"><Delta value={quote.change24hPct} /></Td>
            <Td align="right"><Delta value={quote.change7dPct} showArrow={false} /></Td>
            <Td align="right" mono className="hidden lg:table-cell text-ink-muted">
              {quote.marketCap ? formatCompactMoney(quote.marketCap) : "—"}
            </Td>
            <Td align="right" mono className="hidden lg:table-cell text-ink-muted">
              {quote.volume24h ? formatCompactMoney(quote.volume24h) : "—"}
            </Td>
            <Td align="right">
              <Sparkline
                data={quote.sparkline}
                id={`board-${quote.symbol}`}
                className="ml-auto h-8 w-24"
                positive={quote.change7dPct >= 0}
              />
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
