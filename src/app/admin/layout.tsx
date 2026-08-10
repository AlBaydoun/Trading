import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/shell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Axiom Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  const [deposits, withdrawals, kyc] = await Promise.all([
    prisma.depositRequest.count({
      where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
    }),
    prisma.withdrawalRequest.count({
      where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
    }),
    prisma.kycSubmission.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <AdminShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      }}
      counts={{ deposits, withdrawals, kyc }}
    >
      {children}
    </AdminShell>
  );
}
