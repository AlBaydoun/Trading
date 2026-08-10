"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck, Layers, Activity } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SplitHeading } from "@/components/motion/reveal";
import { Eyebrow } from "@/components/ui/primitives";

/**
 * The WebGL scene is the heaviest thing on the page and it is decorative, so it
 * loads only in the browser and only after the shell has painted. The reserved
 * box means nothing shifts when it arrives.
 */
const CapitalGlobe = dynamic(
  () => import("@/components/three/capital-globe").then((m) => m.CapitalGlobe),
  { ssr: false },
);

const EASE = [0.16, 1, 0.3, 1] as const;

const PROOF = [
  { icon: ShieldCheck, label: "Segregated client accounts" },
  { icon: Layers, label: "Double-entry ledger, fully auditable" },
  { icon: Activity, label: "Position-level transparency" },
];

export function Hero({
  aum,
  investors,
}: {
  aum: string;
  investors: string;
}) {
  const reduced = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden">
      {/* Layered backdrop: engineering grid, then two soft colour washes. */}
      <div className="grid-backdrop pointer-events-none absolute inset-0 -z-10" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[720px] w-[1200px] -translate-x-1/2 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(91,140,255,0.18) 0%, rgba(139,92,246,0.09) 38%, transparent 68%)",
        }}
      />

      <div className="container-page relative">
        <div className="grid items-center gap-10 pb-24 pt-32 md:pt-40 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pb-32">
          {/* ---------------------------------------------------- copy --- */}
          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <Eyebrow>Managed crypto &amp; equity portfolios</Eyebrow>
            </motion.div>

            <SplitHeading
              text="Your capital, deployed with discipline."
              as="h1"
              delay={0.12}
              className="mt-6 text-display-sm font-semibold tracking-tight text-ink sm:text-display md:text-display-lg"
            />

            <motion.p
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
              className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-muted md:text-lg"
            >
              Axiom builds and runs portfolios across cryptocurrency and global
              equity markets. You get a single account, a live view of every
              position and fee, and a ledger you can audit line by line.
            </motion.p>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.62, ease: EASE }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <ButtonLink href="/register" size="lg" className="group">
                Open an account
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </ButtonLink>
              <ButtonLink href="/plans" variant="outline" size="lg">
                Compare the five mandates
              </ButtonLink>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3"
            >
              {PROOF.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-[13px] text-ink-faint"
                >
                  <item.icon className="size-4 text-mint" />
                  {item.label}
                </div>
              ))}
            </motion.div>

            <motion.dl
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9, ease: EASE }}
              className="mt-10 flex divide-x divide-line border-y border-line"
            >
              <div className="py-4 pr-8">
                <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  Assets under management
                </dt>
                <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">
                  {aum}
                </dd>
              </div>
              <div className="py-4 pl-8">
                <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                  Funded accounts
                </dt>
                <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">
                  {investors}
                </dd>
              </div>
            </motion.dl>
          </div>

          {/* ---------------------------------------------------- scene --- */}
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay: 0.25, ease: EASE }}
            className="relative order-first aspect-square w-full lg:order-last lg:aspect-auto lg:h-[620px]"
          >
            <CapitalGlobe className="size-full" />

            {/* Floating readouts anchored to the scene, not part of it. */}
            <FloatingChip
              className="left-[2%] top-[16%]"
              delay={1.1}
              label="BTC allocation"
              value="40.0%"
              tone="mint"
            />
            <FloatingChip
              className="right-[0%] top-[36%]"
              delay={1.3}
              label="Rebalance"
              value="Monthly"
              tone="brand"
            />
            <FloatingChip
              className="bottom-[14%] left-[8%]"
              delay={1.5}
              label="Settlement"
              value="T+0 internal"
              tone="violet"
            />
          </motion.div>
        </div>
      </div>

      {/* Scroll cue — a line that drains downward, on a loop. */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
        <span className="text-[10px] uppercase tracking-[0.24em] text-ink-faint">
          Scroll
        </span>
        <span className="relative block h-10 w-px overflow-hidden bg-line-bright">
          <span className="absolute inset-x-0 top-0 h-4 animate-scan bg-linear-to-b from-transparent via-brand to-transparent" />
        </span>
      </div>
    </section>
  );
}

function FloatingChip({
  className,
  label,
  value,
  tone,
  delay,
}: {
  className?: string;
  label: string;
  value: string;
  tone: "brand" | "mint" | "violet";
  delay: number;
}) {
  const reduced = useReducedMotion();
  const accent = {
    brand: "text-brand-bright",
    mint: "text-mint",
    violet: "text-violet",
  }[tone];

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={`glass absolute hidden rounded-xl px-3.5 py-2.5 md:block ${className}`}
    >
      <p className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p className={`mt-0.5 font-mono text-[15px] font-semibold tabular-nums ${accent}`}>
        {value}
      </p>
    </motion.div>
  );
}
