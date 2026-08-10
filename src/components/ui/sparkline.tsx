import { cn } from "@/lib/utils";

/**
 * Inline SVG sparkline. Hand-rolled rather than pulled from a chart library:
 * it is 40 lines, renders on the server, ships no JavaScript, and needs no
 * responsive-container wrapper to size correctly.
 */
export function Sparkline({
  data,
  className,
  width = 120,
  height = 34,
  strokeWidth = 1.5,
  positive,
  fill = true,
  id,
}: {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  /** Overrides the up/down colour, which otherwise comes from first vs last. */
  positive?: boolean;
  fill?: boolean;
  id?: string;
}) {
  if (!data || data.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cn("overflow-visible", className)}
        aria-hidden="true"
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth="1"
          className="text-line-bright"
          strokeDasharray="3 4"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  // A perfectly flat series would divide by zero — draw it down the middle.
  const range = max - min || 1;
  const pad = strokeWidth;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = pad + (1 - (value - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const area = `${line} L${width},${height} L0,${height} Z`;

  const isUp = positive ?? data[data.length - 1] >= data[0];
  const stroke = isUp ? "var(--color-mint)" : "var(--color-loss)";
  const gradientId = `spark-${id ?? `${isUp ? "up" : "down"}-${data.length}-${Math.round(min)}`}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Larger line chart for the dashboard. Same approach as the sparkline plus
 * axis labels, a baseline and optional area fill.
 */
export function LineChart({
  data,
  labels,
  className,
  height = 220,
  format = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 }),
  accent = "brand",
}: {
  data: number[];
  labels?: string[];
  className?: string;
  height?: number;
  format?: (n: number) => string;
  accent?: "brand" | "mint" | "violet";
}) {
  if (data.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-ink-faint",
          className,
        )}
        style={{ height }}
      >
        Not enough data to plot yet.
      </div>
    );
  }

  const width = 800;
  const padY = 16;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const color = {
    brand: "var(--color-brand)",
    mint: "var(--color-mint)",
    violet: "var(--color-violet)",
  }[accent];

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = padY + (1 - (value - min) / range) * (height - padY * 2);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  // Four evenly spaced gridlines read as a scale without becoming graph paper.
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((t) => max - t * range);

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Line chart ranging from ${format(min)} to ${format(max)}`}
      >
        <defs>
          <linearGradient id={`chart-${accent}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridValues.map((_, index) => {
          const y = padY + (index / (gridValues.length - 1)) * (height - padY * 2);
          return (
            <line
              key={index}
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke="var(--color-line)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        <path d={area} fill={`url(#chart-${accent})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r="3.5"
          fill={color}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-between py-1 pr-1 text-right font-mono text-[10px] tabular-nums text-ink-faint">
        {gridValues.map((value, index) => (
          <span key={index}>{format(value)}</span>
        ))}
      </div>

      {labels && labels.length > 0 && (
        <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-faint">
          {labels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Donut used for allocation breakdowns. */
export function DonutChart({
  segments,
  size = 168,
  thickness = 18,
  className,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  className?: string;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        width={size}
        height={size}
        role="img"
        aria-label={segments.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(", ")}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth={thickness}
        />
        {segments.map((segment) => {
          const fraction = segment.value / total;
          const dash = fraction * circumference;
          // A 2px visual gap between segments keeps adjacent colours distinct.
          const element = (
            <circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(0, dash - 2)} ${circumference - dash + 2}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return element;
        })}
      </svg>

      {(centerValue || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="font-mono text-xl font-semibold tabular-nums text-ink">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
