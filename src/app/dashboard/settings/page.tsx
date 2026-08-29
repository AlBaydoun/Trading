import Link from "next/link";
import { LogOut, Monitor } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { siteConfig } from "@/lib/site-config";
import { formatDate, formatRelativeTime } from "@/lib/money";
import { logoutAction } from "@/actions/auth";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import {
  ProfileForm,
  PasswordForm,
  ReferralPanel,
} from "@/components/dashboard/settings-forms";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { truncate } from "@/lib/utils";

export default async function SettingsPage() {
  const user = await requireUser();

  const [profile, sessions, referrals] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        riskProfile: true,
        marketingOptIn: true,
        createdAt: true,
        lastLoginAt: true,
        referralCode: true,
      },
    }),
    prisma.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
    }),
    prisma.user.count({ where: { referredById: user.id } }),
  ]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your details, your password and the devices signed in to this account."
      />

      <div className="max-w-3xl space-y-6">
        <Panel>
          <PanelHeader title="Account" />
          <dl className="divide-y divide-line">
            {[
              ["Email", user.email],
              ["Account opened", formatDate(profile.createdAt, "long")],
              ["Last sign-in", profile.lastLoginAt ? formatDate(profile.lastLoginAt, "datetime") : "—"],
              ["Referrals", `${referrals} account${referrals === 1 ? "" : "s"}`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-[13.5px] text-ink-muted">{label}</dt>
                <dd className="text-[13.5px] text-ink">{value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <dt className="text-[13.5px] text-ink-muted">Verification</dt>
              <dd className="flex items-center gap-2">
                <StatusPill status={user.kycStatus} />
                {user.kycStatus !== "APPROVED" && (
                  <Link
                    href="/dashboard/verification"
                    className="text-[13px] text-brand-bright hover:text-mint"
                  >
                    Complete →
                  </Link>
                )}
              </dd>
            </div>
          </dl>
        </Panel>

        <ProfileForm
          defaults={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone ?? "",
            country: profile.country ?? "",
            riskProfile: profile.riskProfile,
            marketingOptIn: profile.marketingOptIn,
          }}
        />

        <PasswordForm />

        <ReferralPanel code={profile.referralCode} siteUrl={siteConfig.url} />

        <Panel>
          <PanelHeader
            title="Active sessions"
            description="Devices currently signed in. Changing your password ends all of them except this one."
          />
          <ul className="divide-y divide-line">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line-bright bg-surface-2 text-ink-faint">
                  <Monitor className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-ink">
                    {session.userAgent ? truncate(session.userAgent, 64) : "Unknown device"}
                  </p>
                  <p className="mt-0.5 font-mono text-[11.5px] text-ink-faint">
                    {session.ip ?? "unknown IP"} · started{" "}
                    {formatRelativeTime(session.createdAt)} · expires{" "}
                    {formatDate(session.expiresAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-5">
            <form action={logoutAction}>
              <Button type="submit" variant="danger" size="sm">
                <LogOut className="size-4" />
                Sign out of this device
              </Button>
            </form>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Closing your account"
            description="Close any open positions first — lock-up and early exit terms still apply."
          />
          <div className="space-y-3 p-5 text-[13.5px] leading-relaxed text-ink-muted">
            <p>
              Withdraw your remaining balance, then email compliance to close the
              account. We are required to retain your transaction and identity
              records for five years afterwards, as set out in the{" "}
              <Link href="/legal/privacy" className="text-brand-bright hover:text-mint">
                privacy policy
              </Link>
              .
            </p>
            <Link
              href="/contact?subject=Account%20opening%20or%20verification"
              className="inline-block text-brand-bright hover:text-mint"
            >
              Contact compliance →
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
