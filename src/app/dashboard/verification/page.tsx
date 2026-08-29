import Link from "next/link";
import { BadgeCheck, Clock, ShieldX, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/money";
import { PageHeader } from "@/components/dashboard/page-header";
import { KycForm } from "@/components/dashboard/kyc-form";
import { Alert, Panel, PanelHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export default async function VerificationPage() {
  const user = await requireUser();

  const submission = await prisma.kycSubmission.findFirst({
    where: { userId: user.id },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Identity verification"
        description="Required before you can invest or withdraw. It is a legal obligation, not a preference — read why on our compliance page."
      />

      <div className="max-w-3xl space-y-6">
        {/* ------------------------------------------------- approved --- */}
        {user.kycStatus === "APPROVED" && (
          <>
            <Panel glow className="flex items-start gap-4 p-6">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-mint/35 bg-mint/10 text-mint">
                <BadgeCheck className="size-6" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  Verified
                </h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">
                  Your identity was approved
                  {submission?.reviewedAt && ` on ${formatDate(submission.reviewedAt, "long")}`}
                  . Deposits, allocations and withdrawals are all available.
                </p>
                <p className="mt-3 text-[13px] text-ink-faint">
                  Verification is refreshed periodically — typically every 24
                  months, sooner for higher-risk profiles. We will email you well
                  before anything expires.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <ButtonLink href="/dashboard/investments" size="sm">
                    Choose a mandate
                  </ButtonLink>
                  <ButtonLink href="/dashboard/deposit" size="sm" variant="outline">
                    Add funds
                  </ButtonLink>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="What we hold" />
              <dl className="divide-y divide-line">
                {[
                  ["Document type", submission?.documentType.replace(/_/g, " ").toLowerCase() ?? "—"],
                  ["Nationality", submission?.nationality ?? "—"],
                  ["Country of residence", submission?.country ?? user.email.split("@")[1]],
                  ["Source of funds", submission?.sourceOfFunds.replace(/_/g, " ").toLowerCase() ?? "—"],
                  ["Submitted", submission ? formatDate(submission.submittedAt, "long") : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 px-5 py-3.5">
                    <dt className="text-[13.5px] text-ink-muted">{label}</dt>
                    <dd className="text-[13.5px] capitalize text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-line px-5 py-3.5 text-[12.5px] leading-relaxed text-ink-faint">
                Document numbers and images are not displayed here. To request a
                copy of what we hold, or its deletion once the retention period
                lapses, email compliance — see the{" "}
                <Link href="/legal/privacy" className="text-brand-bright hover:text-mint">
                  privacy policy
                </Link>
                .
              </p>
            </Panel>
          </>
        )}

        {/* -------------------------------------------------- pending --- */}
        {user.kycStatus === "PENDING" && (
          <Panel className="flex items-start gap-4 p-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-gold/35 bg-gold/10 text-gold">
              <Clock className="size-6" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                Under review
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">
                Submitted{" "}
                {submission && formatDate(submission.submittedAt, "datetime")}. Most
                checks clear within one business day. We will email you as soon as
                it is decided — there is nothing else for you to do.
              </p>
              <p className="mt-3 text-[13px] text-ink-faint">
                You can still deposit while this is in review. Funds simply cannot
                be invested or withdrawn until it is approved.
              </p>
            </div>
          </Panel>
        )}

        {/* ------------------------------------------------- rejected --- */}
        {user.kycStatus === "REJECTED" && (
          <>
            <Alert tone="loss" title="Verification was not approved">
              <p className="mt-1">
                {submission?.reviewNotes ||
                  "We could not verify the documents provided. The most common causes are glare, a cropped edge, an expired document, or a name that does not match the account."}
              </p>
            </Alert>
            <Panel className="flex items-start gap-4 p-6">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-loss/35 bg-loss/10 text-loss">
                <ShieldX className="size-6" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  Submit again
                </h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">
                  Fix the issue noted above and resubmit below. If you think this
                  was a mistake,{" "}
                  <Link href="/contact" className="text-brand-bright hover:text-mint">
                    contact compliance
                  </Link>{" "}
                  and we will look again.
                </p>
              </div>
            </Panel>
            <KycForm />
          </>
        )}

        {/* ---------------------------------------------- not started --- */}
        {(user.kycStatus === "NOT_STARTED" || user.kycStatus === "EXPIRED") && (
          <>
            <Alert tone="gold">
              <div className="flex gap-3">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <p>
                  {user.kycStatus === "EXPIRED"
                    ? "Your verification has expired and needs refreshing before you can transact."
                    : "You need to verify your identity before you can invest or withdraw. It takes about five minutes."}
                </p>
              </div>
            </Alert>

            <Panel className="p-6">
              <h2 className="font-display text-[16px] font-semibold text-ink">
                Have these ready
              </h2>
              <ul className="mt-4 space-y-2.5 text-[14px] text-ink-muted">
                {[
                  "A valid passport, national ID card or driving licence",
                  "A selfie holding that document, with both clearly readable",
                  "A utility bill or bank statement from the last three months",
                  "An idea of where the money you are investing came from",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>

            <KycForm />
          </>
        )}
      </div>
    </>
  );
}
