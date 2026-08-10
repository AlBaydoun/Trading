import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/dashboard/shell";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Axiom Capital" },
  robots: { index: false, follow: false },
};

// Balances change on every action — never serve a cached dashboard.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/dashboard");

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return (
    <DashboardShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus,
      }}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
