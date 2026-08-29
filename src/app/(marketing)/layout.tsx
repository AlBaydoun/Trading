import { Suspense } from "react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollProgress } from "@/components/motion/reveal";
import { getSession } from "@/lib/auth/session";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only used to swap "Sign in" for "Dashboard" — no data depends on it, so a
  // null session simply renders the signed-out header.
  const session = await getSession().catch(() => null);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <ScrollProgress />
      <SiteHeader signedIn={Boolean(session)} />

      <main id="main" className="flex-1">
        <Suspense>{children}</Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
