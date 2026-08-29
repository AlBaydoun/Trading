import { PrismaClient } from "@prisma/client";

/**
 * Next.js hot-reloads modules in dev, which would otherwise open a new pool on
 * every save until Postgres refuses connections. Cache the client on globalThis.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type { Prisma } from "@prisma/client";

/**
 * Runs a query and falls back instead of throwing when the database is
 * unreachable.
 *
 * Use this on PUBLIC pages only. A marketing page rendering without its live
 * numbers is a degraded page; a marketing page returning 500 is an outage, and
 * the same call happens at build time — a first deploy usually builds before
 * migrations have run, and a paused free-tier database would otherwise take the
 * whole site down.
 *
 * Never use it on anything that displays money to a signed-in investor or in
 * the admin console. There, a missing balance must surface as an error: showing
 * a fallback figure where a real one belongs is worse than showing nothing.
 */
export async function safeQuery<T>(
  query: () => Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    const reason = error instanceof Error ? error.message.split("\n")[0] : String(error);
    console.warn(`[safeQuery] ${label} unavailable — using fallback. ${reason}`);
    return fallback;
  }
}
