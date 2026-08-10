import type { Metadata } from "next";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { verifyLedgerIntegrity } from "@/lib/ledger";
import { getMarketSnapshot } from "@/lib/market/service";
import { formatDate, formatRelativeTime } from "@/lib/money";
import { buildMetadata } from "@/lib/seo";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Badge, Panel, PanelHeader } from "@/components/ui/primitives";

export const metadata: Metadata = buildMetadata({
  title: "Platform Status",
  description:
    "Live operational status for Axiom Capital: database, market data feed and ledger integrity.",
  path: "/status",
});

export const revalidate = 60;

export default async function StatusPage() {
  const checks: {
    name: string;
    ok: boolean;
    detail: string;
  }[] = [];

  // Database
  let dbOk = true;
  let userCount = 0;
  try {
    userCount = await prisma.user.count();
  } catch {
    dbOk = false;
  }
  checks.push({
    name: "Database",
    ok: dbOk,
    detail: dbOk ? `Reachable · ${userCount} accounts` : "Unreachable",
  });

  // Market data
  let marketDetail = "Unavailable";
  let marketOk = false;
  try {
    const snapshot = await getMarketSnapshot({ limit: 1 });
    marketOk = snapshot.quotes.length > 0;
    marketDetail = marketOk
      ? `${snapshot.source === "live" ? "Live feed" : "Serving cached prices"} · updated ${formatRelativeTime(snapshot.quotes[0].updatedAt)}`
      : "No quotes available";
  } catch {
    marketOk = false;
  }
  checks.push({ name: "Market data", ok: marketOk, detail: marketDetail });

  // Ledger
  let integrity: Awaited<ReturnType<typeof verifyLedgerIntegrity>> | null = null;
  try {
    integrity = await verifyLedgerIntegrity();
  } catch {
    integrity = null;
  }
  checks.push({
    name: "Ledger integrity",
    ok: Boolean(integrity?.balanced),
    detail: integrity
      ? integrity.balanced
        ? `Reconciled · ${integrity.entryCount} entries across ${integrity.accountCount} accounts`
        : `Out of balance by ${integrity.signedSum}`
      : "Check failed",
  });

  const allOk = checks.every((check) => check.ok);

  return (
    <Section className="pt-36 md:pt-44">
      <SectionHeading
        eyebrow="Status"
        title={allOk ? "All systems operational." : "Degraded service."}
        description="Checked live on every request, cached for one minute. This page reflects the platform, not the markets."
      />

      <Panel className="mt-12">
        <PanelHeader
          title="Components"
          action={
            <Badge tone={allOk ? "mint" : "loss"} dot>
              {allOk ? "Operational" : "Issue detected"}
            </Badge>
          }
        />
        <ul className="divide-y divide-line">
          {checks.map((check) => (
            <li key={check.name} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className={check.ok ? "text-mint" : "text-loss"}>
                  {check.ok ? (
                    <CircleCheck className="size-4.5" />
                  ) : (
                    <TriangleAlert className="size-4.5" />
                  )}
                </span>
                <div>
                  <p className="text-[14px] font-medium text-ink">{check.name}</p>
                  <p className="text-[12.5px] text-ink-muted">{check.detail}</p>
                </div>
              </div>
              <Badge tone={check.ok ? "mint" : "loss"}>
                {check.ok ? "operational" : "degraded"}
              </Badge>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-5 py-3 text-[12px] text-ink-faint">
          Last checked {formatDate(new Date(), "datetime")}.
        </p>
      </Panel>
    </Section>
  );
}
