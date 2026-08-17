import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { getSession } from "@/lib/auth/session";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = buildMetadata({
  title: "Open an Investment Account",
  description:
    "Open an Axiom Capital account in a few minutes. Free to open, no obligation to fund, and identity verification is required before any money moves.",
  path: "/register",
  keywords: [
    "open an investment account",
    "investment account sign up",
    "start investing in stocks crypto and commodities",
    "multi-asset investment account",
  ],
});

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const { ref } = await searchParams;
  return <RegisterForm referral={ref?.toUpperCase().slice(0, 12)} />;
}
