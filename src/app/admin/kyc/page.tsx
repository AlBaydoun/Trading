import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/session";
import { formatDate, formatRelativeTime } from "@/lib/money";
import { maskTail } from "@/lib/utils";
import { reviewKycAction } from "@/actions/admin";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import { ReviewForm } from "@/components/admin/review-form";
import {
  Alert,
  EmptyState,
  Panel,
  PanelHeader,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";

export default async function AdminKycPage() {
  const actor = await requireAdmin();
  const canApprove = hasRole(actor.role, "ADMIN");

  const [pending, decided] = await Promise.all([
    prisma.kycSubmission.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.kycSubmission.findMany({
      where: { status: { in: ["APPROVED", "REJECTED", "EXPIRED"] } },
      include: {
        user: { select: { firstName: true, lastName: true } },
        reviewer: { select: { email: true } },
      },
      orderBy: { reviewedAt: "desc" },
      take: 25,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Identity verification"
        description="Check the document is genuine, matches the account name, and that the declared source of funds is plausible for the amounts involved."
      />

      <div className="space-y-6">
        <Alert tone="brand">
          Document images are stored outside the public web root and are not
          rendered here. Wire up an authorised file-serving route before
          reviewing real submissions — see{" "}
          <code className="font-mono text-[12.5px]">src/lib/uploads.ts</code>.
        </Alert>

        <Panel>
          <PanelHeader
            title={`${pending.length} awaiting review`}
            description="A rejection must carry a reason — the investor sees it and needs to know what to fix."
          />
          {pending.length === 0 ? (
            <EmptyState title="Queue is clear" description="No submissions waiting." />
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((submission) => {
                const age = Math.floor(
                  (Date.now() - new Date(submission.dateOfBirth).getTime()) /
                    (365.25 * 86_400_000),
                );

                return (
                  <li key={submission.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Link
                            href={`/admin/users/${submission.user.id}`}
                            className="font-medium text-ink hover:text-brand-bright"
                          >
                            {submission.user.firstName} {submission.user.lastName}
                          </Link>
                          <StatusPill status={submission.status} />
                          {submission.isPep && <StatusPill status="PENDING" />}
                        </div>
                        <p className="mt-1 text-[12.5px] text-ink-muted">
                          {submission.user.email} · account opened{" "}
                          {formatDate(submission.user.createdAt)}
                        </p>

                        <div className="mt-3 grid gap-x-10 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
                          <Row label="Document" value={submission.documentType.replace(/_/g, " ").toLowerCase()} />
                          <Row label="Number" value={maskTail(submission.documentNumber)} mono />
                          <Row label="Expiry" value={formatDate(submission.documentExpiry)} />
                          <Row label="Date of birth" value={`${formatDate(submission.dateOfBirth)} (${age})`} />
                          <Row label="Nationality" value={submission.nationality} />
                          <Row label="Residence" value={`${submission.city}, ${submission.country}`} />
                          <Row label="Address" value={`${submission.addressLine1}, ${submission.postalCode}`} />
                          <Row label="Source of funds" value={submission.sourceOfFunds.replace(/_/g, " ").toLowerCase()} />
                          {submission.occupation && (
                            <Row label="Occupation" value={submission.occupation} />
                          )}
                          {submission.expectedVolume && (
                            <Row label="Expected volume" value={submission.expectedVolume} />
                          )}
                          <Row
                            label="PEP"
                            value={submission.isPep ? "Yes — enhanced monitoring" : "No"}
                          />
                          <Row label="Submitted" value={formatRelativeTime(submission.submittedAt)} />
                        </div>

                        <ul className="mt-3 flex flex-wrap gap-2">
                          {[
                            ["ID front", submission.documentFrontPath],
                            ["ID back", submission.documentBackPath],
                            ["Selfie", submission.selfiePath],
                            ["Proof of address", submission.proofOfAddress],
                          ].map(([label, path]) => (
                            <li
                              key={label}
                              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] ${
                                path
                                  ? "border-mint/30 bg-mint/8 text-mint"
                                  : "border-line-bright text-ink-faint"
                              }`}
                            >
                              <FileText className="size-3" />
                              {label}
                              {!path && " — missing"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4">
                      <ReviewForm
                        id={submission.id}
                        action={reviewKycAction}
                        approveLabel="Approve identity"
                        requireNoteOnReject
                        disabled={!canApprove}
                        approveWarning="Approving unlocks deposits, investing and withdrawals for this account."
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Recently decided" />
          {decided.length === 0 ? (
            <EmptyState title="Nothing decided yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Investor</Th>
                  <Th>Document</Th>
                  <Th>Country</Th>
                  <Th align="center">Status</Th>
                  <Th>Reviewed by</Th>
                  <Th align="right">When</Th>
                </tr>
              </thead>
              <tbody>
                {decided.map((submission) => (
                  <tr key={submission.id}>
                    <Td>
                      {submission.user.firstName} {submission.user.lastName}
                    </Td>
                    <Td className="capitalize">
                      {submission.documentType.replace(/_/g, " ").toLowerCase()}
                    </Td>
                    <Td>{submission.country}</Td>
                    <Td align="center"><StatusPill status={submission.status} /></Td>
                    <Td className="text-[12.5px] text-ink-muted">
                      {submission.reviewer?.email ?? "—"}
                    </Td>
                    <Td align="right" className="text-ink-muted">
                      {formatDate(submission.reviewedAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-faint">{label}</dt>
      <dd className={`min-w-0 capitalize text-ink-muted ${mono ? "font-mono normal-case" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
