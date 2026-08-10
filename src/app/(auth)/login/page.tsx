import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = buildMetadata({
  title: "Sign In",
  description: "Sign in to your Axiom Capital investment account.",
  path: "/login",
  // A sign-in form has no organic search value and would dilute crawl budget.
  noIndex: true,
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(session.role === "USER" ? "/dashboard" : "/admin");

  const { next } = await searchParams;
  // Only ever propagate a same-origin path.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return <LoginForm next={safeNext} />;
}
