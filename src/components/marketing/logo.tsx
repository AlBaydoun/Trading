import { cn } from "@/lib/utils";

/**
 * The mark: an ascending pair of chevrons inside a rotated square — an "A" that
 * doubles as a rising channel. Drawn as inline SVG so it inherits currentColor,
 * scales without a request, and never causes a layout shift.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="axiom-mark" x1="4" y1="28" x2="28" y2="4">
          <stop offset="0%" stopColor="#2f55c9" />
          <stop offset="52%" stopColor="#5b8cff" />
          <stop offset="100%" stopColor="#00e5b0" />
        </linearGradient>
      </defs>

      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="8"
        stroke="url(#axiom-mark)"
        strokeWidth="1.6"
        opacity="0.55"
      />
      <path
        d="M9 21.5 L16 10 L23 21.5"
        stroke="url(#axiom-mark)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.6 21.5 L16 15.8 L19.4 21.5"
        stroke="url(#axiom-mark)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  );
}
