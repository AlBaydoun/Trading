import Link from "next/link";
import { getTickerQuotes } from "@/lib/market/service";
import { formatPrice } from "@/lib/money";
import { Delta } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Continuous price strip. The track holds two identical copies of the list and
 * translates by exactly -50%, so the loop is seamless without any JavaScript —
 * one CSS animation, paused on hover and by `prefers-reduced-motion`.
 */
export async function MarketTicker({ className }: { className?: string }) {
  const quotes = await getTickerQuotes(16);

  if (quotes.length === 0) return null;

  const items = [...quotes, ...quotes];

  return (
    <div
      className={cn(
        "mask-fade-x group relative overflow-hidden border-y border-line bg-abyss/70 py-2.5",
        className,
      )}
      aria-label="Live market prices"
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {items.map((quote, index) => (
          <Link
            key={`${quote.symbol}-${index}`}
            href={`/markets#${quote.symbol}`}
            className="flex shrink-0 items-baseline gap-2.5 border-r border-line px-5 transition-colors hover:bg-surface/60"
            // The second copy is decorative — announcing it would read every
            // price twice.
            aria-hidden={index >= quotes.length}
            tabIndex={index >= quotes.length ? -1 : undefined}
          >
            <span className="font-mono text-[12px] font-semibold tracking-wide text-ink">
              {quote.symbol}
            </span>
            <span className="font-mono text-[12px] tabular-nums text-ink-muted">
              {formatPrice(quote.price)}
            </span>
            <Delta value={quote.change24hPct} className="text-[11px]" showArrow={false} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function MarketTickerSkeleton() {
  return (
    <div className="border-y border-line bg-abyss/70 py-2.5">
      <div className="flex gap-5 px-5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="skeleton h-4 w-28 shrink-0" />
        ))}
      </div>
    </div>
  );
}
