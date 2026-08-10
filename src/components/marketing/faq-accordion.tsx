"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { FaqItem } from "@/lib/content/faq";
import { cn } from "@/lib/utils";

/**
 * Native `<button>` + `aria-expanded` rather than `<details>`, because the
 * height animation needs a measured value and `<details>` cannot be animated
 * open reliably across browsers. Content stays in the DOM when collapsed so
 * in-page search still finds it.
 */
export function FaqAccordion({
  items,
  className,
}: {
  items: FaqItem[];
  className?: string;
}) {
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item, index) => {
        const isOpen = open === index;

        return (
          <div key={item.question}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${index}`}
                className="flex w-full items-start justify-between gap-6 py-5 text-left transition-colors hover:text-brand-bright"
              >
                <span className="font-display text-[17px] font-medium leading-snug text-ink">
                  {item.question}
                </span>
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-line-bright transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    isOpen && "rotate-45 border-brand/60 bg-brand/12 text-brand",
                  )}
                >
                  <Plus className="size-3.5" />
                </span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`faq-panel-${index}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-3xl pb-6 pr-12 text-[15px] leading-relaxed text-ink-muted">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
