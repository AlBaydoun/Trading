"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  Bell,
  ChevronDown,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Logo } from "@/components/marketing/logo";
import { logoutAction } from "@/actions/auth";

export interface ShellUser {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  kycStatus: string;
}

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/investments", label: "Investments", icon: LineChart },
  { href: "/dashboard/deposit", label: "Deposit", icon: ArrowDownToLine },
  { href: "/dashboard/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/verification", label: "Verification", icon: BadgeCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({
  user,
  unreadCount,
  children,
}: {
  user: ShellUser;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const isStaff = user.role !== "USER";

  const navList = (
    <nav className="flex flex-col gap-0.5" aria-label="Dashboard">
      {NAV.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
              active
                ? "bg-brand/12 text-ink"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-indicator"
                className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            <item.icon
              className={cn(
                "size-4.5 shrink-0 transition-colors",
                active ? "text-brand-bright" : "text-ink-faint group-hover:text-ink-muted",
              )}
            />
            {item.label}
            {item.href === "/dashboard/verification" &&
              user.kycStatus !== "APPROVED" && (
                <span className="ml-auto size-1.5 rounded-full bg-gold shadow-[0_0_8px_currentColor]" />
              )}
          </Link>
        );
      })}

      {isStaff && (
        <>
          <div className="my-3 h-px bg-line" />
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-mint transition-colors hover:bg-mint/10"
          >
            <ShieldCheck className="size-4.5 shrink-0" />
            Admin console
          </Link>
        </>
      )}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* ------------------------------------------------ desktop rail --- */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-abyss px-4 py-5 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2">
          <Logo className="size-8" />
          <span className="font-display text-[16px] font-semibold tracking-tight">
            Axiom<span className="text-ink-faint"> Capital</span>
          </span>
        </Link>

        <div className="mt-7 flex-1">{navList}</div>

        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">
            Need a hand?
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
            The team replies within one business day.
          </p>
          <Link
            href="/contact"
            className="mt-2.5 inline-block text-[12.5px] font-medium text-brand-bright hover:text-mint"
          >
            Contact support →
          </Link>
        </div>
      </aside>

      {/* ------------------------------------------------------- main --- */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-void/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-line-bright text-ink lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-4.5" />
            </button>

            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-[13px] text-ink-muted">
                Signed in as{" "}
                <span className="font-medium text-ink">{user.email}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard#notifications"
                className="relative flex size-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
              >
                <Bell className="size-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-[9px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-xl border border-line-bright px-2 py-1.5 transition-colors hover:bg-surface-2"
                >
                  <span
                    className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-brand to-violet text-[11px] font-semibold text-white"
                    aria-hidden="true"
                  >
                    {initials(user.firstName, user.lastName)}
                  </span>
                  <span className="hidden text-[13px] font-medium text-ink sm:block">
                    {user.firstName}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-ink-faint transition-transform duration-300",
                      menuOpen && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <>
                      <button
                        className="fixed inset-0 z-10 cursor-default"
                        onClick={() => setMenuOpen(false)}
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.99 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        role="menu"
                        className="glass absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl p-1.5"
                      >
                        <div className="border-b border-line px-3 py-2.5">
                          <p className="truncate text-[13px] font-medium text-ink">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="truncate text-[11.5px] text-ink-faint">
                            {user.email}
                          </p>
                        </div>

                        <Link
                          href="/dashboard/settings"
                          role="menuitem"
                          className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          <Settings className="size-4" />
                          Account settings
                        </Link>

                        <form action={logoutAction}>
                          <button
                            type="submit"
                            role="menuitem"
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-loss transition-colors hover:bg-loss/10"
                          >
                            <LogOut className="size-4" />
                            Sign out
                          </button>
                        </form>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>

      {/* ------------------------------------------------ mobile drawer --- */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-void/80 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-line bg-abyss px-4 py-5 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                  <Logo className="size-7" />
                  <span className="font-display text-[15px] font-semibold">
                    Axiom
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex size-9 items-center justify-center rounded-lg text-ink-muted"
                  aria-label="Close menu"
                >
                  <X className="size-4.5" />
                </button>
              </div>
              <div className="mt-6 flex-1 overflow-y-auto">{navList}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
