"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  BookOpenCheck,
  ExternalLink,
  Gauge,
  Layers,
  LogOut,
  Menu,
  ScrollText,
  Users,
  X,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Logo } from "@/components/marketing/logo";
import { logoutAction } from "@/actions/auth";

export interface AdminNavCounts {
  deposits: number;
  withdrawals: number;
  kyc: number;
}

const NAV = [
  { href: "/admin", label: "Overview", icon: Gauge, exact: true },
  { href: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine, badge: "deposits" as const },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine, badge: "withdrawals" as const },
  { href: "/admin/kyc", label: "Verification", icon: BadgeCheck, badge: "kyc" as const },
  { href: "/admin/users", label: "Investors", icon: Users },
  { href: "/admin/investments", label: "Positions", icon: Layers },
  { href: "/admin/plans", label: "Mandates", icon: BookOpenCheck },
  { href: "/admin/ledger", label: "Ledger", icon: ScrollText },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminShell({
  user,
  counts,
  children,
}: {
  user: { firstName: string; lastName: string; email: string; role: string };
  counts: AdminNavCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const readOnly = user.role === "ANALYST";

  const navList = (
    <nav className="flex flex-col gap-0.5" aria-label="Admin">
      {NAV.map((item) => {
        const active = isActive(item.href, item.exact);
        const count = item.badge ? counts[item.badge] : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
              active
                ? "bg-mint/12 text-ink"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            <item.icon
              className={cn(
                "size-4.5 shrink-0",
                active ? "text-mint" : "text-ink-faint group-hover:text-ink-muted",
              )}
            />
            <span className="flex-1">{item.label}</span>
            {count > 0 && (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-gold/20 px-1.5 text-[10.5px] font-semibold text-gold">
                {count}
              </span>
            )}
          </Link>
        );
      })}

      <div className="my-3 h-px bg-line" />

      <Link
        href="/dashboard"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <ExternalLink className="size-4.5 shrink-0 text-ink-faint" />
        Investor view
      </Link>
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-abyss px-3.5 py-5 lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2">
          <Logo className="size-7" />
          <span className="font-display text-[15px] font-semibold tracking-tight">
            Axiom
            <span className="ml-1.5 rounded-md bg-mint/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mint">
              Admin
            </span>
          </span>
        </Link>

        <div className="mt-6 flex-1 overflow-y-auto">{navList}</div>

        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-mint to-brand text-[11px] font-semibold text-void"
              aria-hidden="true"
            >
              {initials(user.firstName, user.lastName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-medium text-ink">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-[11px] text-ink-faint">
                {user.role.replace("_", " ").toLowerCase()}
              </p>
            </div>
          </div>
          <form action={logoutAction} className="mt-2.5">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-loss transition-colors hover:bg-loss/10"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-void/85 px-4 backdrop-blur-xl md:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg border border-line-bright text-ink"
            aria-label="Open menu"
          >
            <Menu className="size-4.5" />
          </button>
          <span className="font-display text-[15px] font-semibold">Admin</span>
          <span className="w-9" />
        </header>

        {readOnly && (
          <div className="border-b border-gold/25 bg-gold/[0.07] px-4 py-2 text-center text-[12.5px] text-gold md:px-6">
            Analyst access — you can view everything here but cannot approve,
            adjust or change anything.
          </div>
        )}

        <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>

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
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-line bg-abyss px-3.5 py-5 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-[15px] font-semibold">
                  Axiom Admin
                </span>
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
