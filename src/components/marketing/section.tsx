import * as React from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/primitives";
import { Reveal } from "@/components/motion/reveal";

/**
 * The rhythm every marketing section shares: generous vertical space, an
 * optional eyebrow, a display heading and a single supporting paragraph.
 * Consistency here is what stops a long landing page reading as a pile of
 * unrelated blocks.
 */
export function Section({
  children,
  className,
  id,
  bleed = false,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Drops the container so a child can run edge to edge. */
  bleed?: boolean;
}) {
  return (
    <section id={id} className={cn("relative py-20 md:py-28 lg:py-32", className)}>
      {bleed ? children : <div className="container-page">{children}</div>}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  action,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "md:flex-col md:items-center",
        className,
      )}
    >
      <Reveal className={cn("max-w-2xl", align === "center" && "text-center")}>
        {eyebrow && (
          <Eyebrow className={cn(align === "center" && "justify-center")}>
            {eyebrow}
          </Eyebrow>
        )}
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl md:text-[42px] md:leading-[1.08]">
          {title}
        </h2>
        {description && (
          <p className="mt-4 text-[16.5px] leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </Reveal>

      {action && <Reveal delay={0.1} className="shrink-0">{action}</Reveal>}
    </div>
  );
}

/** Full-bleed hairline with a soft glow at its centre — a section separator. */
export function Divider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-px w-full bg-linear-to-r from-transparent via-line-bright to-transparent",
        className,
      )}
      aria-hidden="true"
    />
  );
}
