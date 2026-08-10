import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { formatMoney, formatDate } from "@/lib/money";
import { methodLabel } from "@/lib/operations/money";
import { PageHeader, StatusPill } from "@/components/dashboard/page-header";
import { DepositForm } from "@/components/dashboard/deposit-form";
import {
  EmptyState,
  Panel,
  PanelHeader,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";

export default async function DepositPage() {
  const user = await requireUser();

  const deposits = await prisma.depositRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Deposits are accepted before KYC completes — the funds simply cannot be
  // invested or withdrawn until it does. That is deliberate: it lets someone
  // fund while verification is in review, and it is why this page has no hard
  // block where the withdraw page does.
  const blocked =
    user.kycStatus === "APPROVED"
      ? null
      : "You can deposit now, but funds cannot be invested or withdrawn until identity verification is approved.";

  const instructions = {
    bankName: process.env.DEPOSIT_BANK_NAME || "Axiom Capital Client Money Account",
    iban: process.env.DEPOSIT_BANK_IBAN || "Contact support for bank details",
    swift: process.env.DEPOSIT_BANK_SWIFT || "—",
    btc: process.env.DEPOSIT_BTC_ADDRESS || "Contact support for a deposit address",
    eth: process.env.DEPOSIT_ETH_ADDRESS || "Contact support for a deposit address",
    usdt: process.env.DEPOSIT_USDT_TRC20_ADDRESS || "Contact support for a deposit address",
  };

  return (
    <>
      <PageHeader
        title="Deposit funds"
        description="Tell us what you are sending and how, then transfer using the details shown. Operations matches the payment and credits your cash balance."
      />

      <div className="space-y-6">
        <DepositForm instructions={instructions} blocked={blocked} />

        <Panel>
          <PanelHeader
            title="Deposit history"
            description="Pending requests are matched against incoming payments by reference."
          />
          {deposits.length === 0 ? (
            <EmptyState
              title="No deposits yet"
              description="Your requests and their status will appear here."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Method</Th>
                  <Th align="right">Amount</Th>
                  <Th align="center">Status</Th>
                  <Th align="right">Requested</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((deposit) => (
                  <tr key={deposit.id}>
                    <Td mono className="text-ink-muted">{deposit.reference}</Td>
                    <Td>{methodLabel(deposit.method)}</Td>
                    <Td align="right" mono>{formatMoney(deposit.amount)}</Td>
                    <Td align="center">
                      <StatusPill status={deposit.status} />
                    </Td>
                    <Td align="right" className="text-ink-muted">
                      {formatDate(deposit.createdAt)}
                    </Td>
                    <Td className="max-w-xs text-[13px] text-ink-muted">
                      {deposit.reviewNotes || "—"}
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
