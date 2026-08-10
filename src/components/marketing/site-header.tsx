"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ChevronDown, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/marketing/logo";

interface NavItem {
  label: string;
  href: string;
  description?: string;
  children?: { label: string; href: string; description: string }[];
}

const NAV: NavItem[] = [
  {
    label: "Invest",
    href: "/plans",
    children: [
      {
        label: "Investment plans",
        href: "/plans",
        description: "Five mandates, from dollar income to concentrated growth",
      },
      {
        label: "How it works",
        href: "/how-it-works",
        description: "Account opening, funding, allocation and withdrawal",
      },
      {
        label: "Fees",
        href: "/legal/fees",
        description: "Every charge, on one page, with worked examples",
      },
    ],
  },
  { label: "Markets", href: "/markets" },
  { label: "Insights", href: "/insights" },
  {
    label: "Company",
    href: "/about",
    children: [
      { label: "About", href: "/about", description: "Who runs the desk and how" },
      { label: "Security & custody", href: "/security", description: "Where client assets sit" },
      { label: "FAQ", href: "/faq", description: "The questions we get most" },
      { label: "Contact", href: "/contact", description: "Talk to the investment team" },
    ],
  },
];

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Route change closes everything — otherwise the menu survives navigation.
  React.useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setOpenMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // A short grace period stops the panel snapping shut while the pointer
  // crosses the gap between the trigger and the panel itself.
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        scrolled
          ? "border-b border-line/80 bg-void/80 backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page">
        <div className="flex h-[72px] items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg"
            aria-label={`${siteConfig.name} home`}
          >
            <Logo className="size-8" />
            <span className="font-display text-[17px] font-semibold tracking-tight">
              {siteConfig.shortName}
              <span className="text-ink-faint"> Capital</span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Primary"
          >
            {NAV.map((item) =>
              item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onPointerEnter={() => {
                    cancelClose();
                    setOpenMenu(item.label);
                  }}
                  onPointerLeave={scheduleClose}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                      isActive(item.href)
                        ? "text-ink"
                        : "text-ink-muted hover:text-ink",
                    )}
                    aria-expanded={openMenu === item.label}
                    aria-haspopup="true"
                    onClick={() =>
                      setOpenMenu(openMenu === item.label ? null : item.label)
                    }
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform duration-300",
                        openMenu === item.label && "rotate-180",
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {openMenu === item.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.99 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute left-0 top-full w-[340px] pt-3"
                      >
                        <div className="glass overflow-hidden rounded-2xl p-1.5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.95)]">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="group flex flex-col gap-0.5 rounded-xl px-3.5 py-3 transition-colors hover:bg-brand/10"
                            >
                              <span className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
                                {child.label}
                                <ArrowUpRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                              </span>
                              <span className="text-[12.5px] leading-snug text-ink-muted">
                                {child.description}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                    isActive(item.href)
                      ? "text-ink"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {signedIn ? (
              <ButtonLink href="/dashboard" size="sm">
                Dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/register" size="sm">
                  Open an account
                </ButtonLink>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex size-10 items-center justify-center rounded-xl border border-line-bright text-ink lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-line bg-void/97 backdrop-blur-xl lg:hidden"
          >
            <nav
              className="container-page flex max-h-[calc(100dvh-72px)] flex-col gap-1 overflow-y-auto py-5"
              aria-label="Mobile"
            >
              {NAV.map((item) => (
                <div key={item.label} className="py-1">
                  <Link
                    href={item.href}
                    className="block py-2 font-display text-lg font-semibold text-ink"
                  >
                    {item.label}
                  </Link>
                  {item.children && (
                    <div className="ml-0.5 flex flex-col gap-0.5 border-l border-line pl-4">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="py-1.5 text-[14px] text-ink-muted"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="mt-4 flex flex-col gap-2.5 border-t border-line pt-5">
                {signedIn ? (
                  <ButtonLink href="/dashboard" size="lg">
                    Go to dashboard
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink href="/register" size="lg">
                      Open an account
                    </ButtonLink>
                    <ButtonLink href="/login" variant="outline" size="lg">
                      Sign in
                    </ButtonLink>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
