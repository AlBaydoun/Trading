import type { Metadata } from "next";
import type { AssetKind } from "@prisma/client";
import { getMarketBoard, getMarketStats } from "@/lib/market/service";
import { formatQuote, formatCompactMoney } from "@/lib/money";
import { buildMetadata, JsonLd, breadcrumbSchema } from "@/lib/seo";
import { ASSET_CLASSES } from "@/lib/market/types";
import type { Quote } from "@/lib/market/types";
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

export const metadata: Metadata = buildMetadata({
  title: "Live Markets — Crypto, Stocks, Forex, Commodities & Bonds",
  description:
    "Live prices across every major market: cryptocurrencies, global equities, currency pairs, metals and energy, benchmark indices, government bond yields and listed property.",
  path: "/markets",
  keywords: [
    "live market prices",
    "crypto prices",
    "stock prices",
    "forex rates",
    "gold and oil prices",
    "bond yields",
    "commodity prices today",
  ],
});

export const revalidate = 300;

/** Which columns make sense differs by class — a bond yield has no market cap. */
function showsMarketCap(kind: AssetKind): boolean {
  return kind === "CRYPTO" || kind === "EQUITY" || kind === "REIT";
}

export default async function MarketsPage() {
  const [board, stats] = await Promise.all([getMarketBoard(), getMarketStats()]);

  const hasEquityFeed = Boolean(process.env.FINNHUB_API_KEY);

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
          title="Every market the desk watches."
          description="Cryptocurrencies, equities, currencies, commodities, indices, government bonds and listed property — one board. Prices are indicative and for information only; they are not dealing quotes."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Instruments tracked"
            value={board.total}
            sub={`${board.groups.length} asset classes`}
            tone="brand"
          />
          <Stat
            label="Crypto market cap"
            value={formatCompactMoney(stats.totalMarketCap)}
            sub="All tracked digital assets"
          />
          <Stat
            label="24h crypto volume"
            value={formatCompactMoney(stats.totalVolume24h)}
            sub="Across all venues"
          />
          <Stat
            label="BTC dominance"
            value={`${stats.btcDominancePct.toFixed(1)}%`}
            sub="Share of digital asset value"
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <MoversPanel title="Top gainers · 24h" quotes={stats.gainers} positive />
          <MoversPanel title="Top decliners · 24h" quotes={stats.losers} />
        </div>

        {/* Jump links — the board is long and this is the fastest way down it. */}
        <Reveal className="mt-10 flex flex-wrap gap-2">
          {board.groups.map((group) => (
            <a
              key={group.kind}
              href={`#${group.kind.toLowerCase()}`}
              className="rounded-full border border-line-bright px-3.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:border-brand/50 hover:text-brand-bright"
            >
              {ASSET_CLASSES[group.kind].short}
              <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
                {group.quotes.length}
              </span>
            </a>
          ))}
        </Reveal>
      </Section>

      {/* --------------------------------------------------- class sections --- */}
      <Section className="border-t border-line bg-abyss pt-0 md:pt-0">
        <div className="space-y-8">
          {board.groups.map((group) => {
            const meta = ASSET_CLASSES[group.kind];
            // Crypto and forex have genuine live feeds; the rest fall back to
            // indicative pricing unless an equity provider key is configured.
            const isLive =
              group.kind === "CRYPTO" ||
              group.kind === "FOREX" ||
              hasEquityFeed;

            return (
              <Reveal key={group.kind}>
                <Panel id={group.kind.toLowerCase()} className="scroll-mt-24">
                  <PanelHeader
                    title={meta.label}
                    description={meta.blurb}
                    action={
                      <Badge tone={isLive ? "mint" : "outline"} dot={isLive}>
                        {isLive ? "Live" : "Indicative"}
                      </Badge>
                    }
                  />
                  <QuoteTable quotes={group.quotes} kind={group.kind} />
                  <p className="border-t border-line px-5 py-2.5 text-[11.5px] text-ink-faint">
                    Price column: {meta.quote}.
                  </p>
                </Panel>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <Section>
        <div className="panel px-6 py-8 md:px-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            Where these numbers come from
          </h2>
          <div className="mt-4 grid gap-6 text-[14px] leading-relaxed text-ink-muted md:grid-cols-3">
            <div>
              <p className="font-medium text-ink">Live feeds</p>
              <p className="mt-1.5">
                Cryptocurrency prices come from CoinGecko&apos;s aggregate feed —
                a volume-weighted average across venues, not any single
                exchange&apos;s book. Currency rates come from a daily reference
                feed, and their percentage moves are measured against our own
                stored history rather than taken on trust.
              </p>
            </div>
            <div>
              <p className="font-medium text-ink">Indicative rows</p>
              <p className="mt-1.5">
                {hasEquityFeed
                  ? "Equities, indices, commodities and bonds are delayed by up to fifteen minutes depending on the exchange, and are not suitable for timing a trade."
                  : "Without an equity data subscription, equities, indices, commodities, bonds and property move within a narrow band around a baseline. They are labelled Indicative and must never be read as tradeable."}
              </p>
            </div>
            <div>
              <p className="font-medium text-ink">What this page is not</p>
              <p className="mt-1.5">
                Nothing here is an offer, a recommendation or a dealing quote.
                Axiom runs managed mandates across these markets; it does not
                operate an exchange and does not accept individual trade
                instructions.
              </p>
            </div>
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
          <li key={quote.symbol} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Ticker symbol={quote.symbol} />
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
                {formatQuote(quote.price, quote.kind)}
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

function Ticker({ symbol }: { symbol: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-bright bg-surface-2 font-mono text-[10px] font-semibold text-ink-muted">
      {symbol.slice(0, 3)}
    </span>
  );
}

function QuoteTable({ quotes, kind }: { quotes: Quote[]; kind: AssetKind }) {
  if (quotes.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-ink-faint">
        No instruments to display.
      </p>
    );
  }

  const withCap = showsMarketCap(kind);

  return (
    <Table className="min-w-[760px]">
      <thead>
        <tr>
          <Th>Instrument</Th>
          <Th align="right">Price</Th>
          <Th align="right">24h</Th>
          <Th align="right">7d</Th>
          {withCap && (
            <Th align="right" className="hidden lg:table-cell">
              Market cap
            </Th>
          )}
          <Th align="right" className="hidden lg:table-cell">
            Volume 24h
          </Th>
          <Th align="right">7-day trend</Th>
        </tr>
      </thead>
      <tbody>
        {quotes.map((quote) => (
          <tr
            key={quote.symbol}
            id={quote.symbol}
            className="scroll-mt-24 transition-colors target:bg-brand/8 hover:bg-surface-2/60"
          >
            <Td>
              <div className="flex items-center gap-3">
                <Ticker symbol={quote.symbol} />
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
            <Td align="right" mono>{formatQuote(quote.price, quote.kind)}</Td>
            <Td align="right"><Delta value={quote.change24hPct} /></Td>
            <Td align="right"><Delta value={quote.change7dPct} showArrow={false} /></Td>
            {withCap && (
              <Td align="right" mono className="hidden lg:table-cell text-ink-muted">
                {quote.marketCap ? formatCompactMoney(quote.marketCap) : "—"}
              </Td>
            )}
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
