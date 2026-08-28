# Axiom Capital

A multi-asset investment platform — equities, cryptocurrency, foreign exchange,
commodities, indices, bonds and listed property. Public marketing site, investor
dashboard, and an admin console for the people who run the desk.

Built on Next.js 15 (App Router), TypeScript, Tailwind v4, Prisma and
PostgreSQL. Money is tracked in a real double-entry ledger — not a balance
column — so every figure on every screen traces back to a balanced journal
entry.

> **Rename the product in one place.** `src/lib/site-config.ts` holds the brand
> name, legal name, contact details and SEO defaults. Change `name` and
> `legalName` there and the whole site follows.

---

## Before you accept real money

This is working software, not a licensed business. Three things must happen
before a single real deposit:

1. **Licensing.** Taking money from the public to invest is a regulated activity
   in essentially every jurisdiction. Talk to a financial services lawyer where
   you intend to operate, get authorised, then put the regulator's name and your
   firm reference number on `/about`.
2. **Legal review.** The documents in `src/lib/content/legal.ts` are drafts.
   Each renders a visible "pending legal review" banner until you set
   `reviewed: true` on it, which you should only do once a lawyer has signed it
   off.
3. **Real custody.** The ledger tracks what you owe investors. It does not move
   money. Wire up a bank and a qualified custodian, and reconcile against them
   daily.

Everything else — the ledger, KYC flow, approval queues, audit trail — is built
to support that, and is ready to be pointed at real infrastructure.

---

## Getting started

**Requirements:** Node 20.11+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL and AUTH_SECRET
openssl rand -base64 48       # paste the output as AUTH_SECRET

npm run db:migrate            # create the schema
npm run db:seed               # plans, assets, articles, staff, demo investors
npm run dev
```

Open http://localhost:3000.

**Seeded logins** (change `SEED_ADMIN_PASSWORD` before any real deployment):

| Role     | Email                          | Password            |
| -------- | ------------------------------ | ------------------- |
| Investor | `demo@axiomcapital.example`    | `Demo!2024Investor` |
| Admin    | `admin@axiomcapital.example`   | `ChangeMe!2024`     |
| Analyst  | `analyst@axiomcapital.example` | `Demo!2024Investor` |

The analyst account is read-only — useful for checking that the two privilege
tiers behave as intended.

---

## How money works

Every movement of value posts a **balanced journal entry**. There is no code
path that writes a single-sided line: `postEntry` rejects an unbalanced entry
before touching the database.

```
Deposit approved      Dr Client money — bank        Cr Investor cash
Allocation            Dr Investor cash              Cr Allocated capital
Return credited       Dr Client assets — custody    Cr Allocated capital
Position closed       Dr Allocated capital          Cr Investor cash + fees
Withdrawal approved   Dr Investor cash              Cr Bank + withdrawal fee
```

Sign convention: `LedgerAccount.balance` always holds the account's *natural*
balance. Assets and expenses increase on debit; liabilities, equity and income
increase on credit. An investor's cash is a **liability** — the platform owes it
to them.

`verifyLedgerIntegrity()` re-derives every balance from the journal lines and
checks the whole book sums to zero. It runs on the admin overview and the ledger
page, so a drift is visible immediately rather than at the next audit.

Two safeguards worth knowing about:

- **Available cash** is the ledger balance minus any pending withdrawal, so two
  concurrent full-balance withdrawals cannot both be approved.
- **Ledgers are append-only.** A mistake is corrected by posting a reversal that
  points back at the original entry. Nothing is edited or deleted.

Run the operations end to end against your database:

```bash
npm run verify:ops
```

It approves a deposit and a withdrawal, opens a position, accrues a gain and a
loss, closes it, and asserts the ledger reconciles after every step — plus that
double-approval, over-allocation and overdraw are all rejected.

---

## Layout

```
prisma/
  schema.prisma              data model — identity, KYC, ledger, plans, content
  seed.ts                    idempotent seed with backdated ledger history
  seed-data/                 plans, market assets (8 classes), articles
src/
  actions/                   server actions (auth, investor, admin, contact)
  app/
    (marketing)/             public site — home, plans, markets, insights, legal
    (auth)/                  login and register
    dashboard/               investor area
    admin/                   operations console
    api/                     OG images, CSV export
  components/
    three/capital-globe.tsx  the WebGL hero scene
    motion/                  scroll choreography
    ui/                      buttons, panels, forms, charts
  lib/
    ledger.ts                double-entry engine
    operations/money.ts      deposits, withdrawals, allocations, accruals
    auth/                    sessions, password hashing, route guards
    market/                  price providers, caching, fallback
    seo.tsx                  metadata builder and JSON-LD
    content/                 FAQ and legal documents
```

---

## Auth

Sessions are opaque 32-byte tokens in an `httpOnly` cookie; the database stores
only an HMAC of the token, so a dump of the sessions table cannot be replayed as
a login. Passwords use bcrypt at cost 12, with per-account and per-IP rate
limiting and automatic lockout after repeated failures.

Roles form a hierarchy: `USER` → `ANALYST` → `ADMIN` → `SUPER_ADMIN`. Analysts
can read the whole admin console and change nothing; only admins approve money
movements; only super admins change roles.

`src/middleware.ts` does an **optimistic** redirect on cookie presence — it runs
on the Edge and cannot reach the database. The authoritative check is
`requireUser` / `requireRole`, which every private page and server action calls.
A forged cookie gets past middleware and straight into a real lookup that
rejects it.

---

## SEO

- `buildMetadata()` in `src/lib/seo.tsx` produces canonical URLs, hreflang
  alternates, Open Graph and Twitter cards for every page from one call.
- JSON-LD for `FinancialService`, `WebSite`, `FAQPage`, `BreadcrumbList`,
  `Article`, `FinancialProduct`, `HowTo` and `ItemList`.
- `sitemap.xml` is generated from the database, so new articles and plans appear
  without anyone remembering to add them.
- `robots.ts` blocks indexing entirely unless the deployment looks like
  production — a preview URL competing with production for the same content is a
  self-inflicted ranking problem.
- OG cards are rendered on demand at `/api/og` and cached at the edge.
- RSS at `/feed.xml`.

The six seeded articles are real writing that answers real queries. Thin,
keyword-stuffed pages rank worse than no pages at all, and they attract the
wrong investors.

---

## Adding a language

The i18n groundwork is in place and English is the only locale switched on.

1. Add the code to `LOCALES` in `src/lib/site-config.ts` (`PLANNED_LOCALES`
   already lists `ar`, `ru`, `de`, `fr`).
2. Move the marketing routes under an `app/[locale]/` segment.
3. Add the translated strings.

hreflang tags and sitemap alternates are already driven by `LOCALES`, so they
update by themselves. `RTL_LOCALES` handles the `dir` attribute for Arabic.

---

## The 3D hero

`src/components/three/capital-globe.tsx` is hand-written three.js — a shader
point cloud, a wireframe lattice, a fresnel atmosphere and arcs carrying
travelling pulses between market nodes. No scene-graph wrapper library, so it
costs three.js core plus four small shaders instead of a React renderer and a
helper pack.

It pauses when scrolled off-screen or when the tab is hidden, renders a single
static frame under `prefers-reduced-motion`, falls back to a CSS gradient
without WebGL, caps device pixel ratio at 2, and disposes every GPU resource on
unmount.

---

## Market data

Reads always come from our own database; a refresh writes to it. A rate-limited
provider degrades the *freshness* of prices, never the availability of the site.

Eight asset classes are tracked: crypto, equities, ETFs, forex, commodities,
indices, bonds and REITs.

- **Crypto** — CoinGecko's public tier. Live, no key needed
  (`COINGECKO_API_KEY` raises the rate limit).
- **Forex** — exchangerate-api's open endpoint. Live, no key. The feed returns
  only a spot rate, so the 24-hour and 7-day changes are measured against our
  own `PriceSnapshot` history rather than fabricated.
- **Equities, indices, commodities, bonds, property** — optional
  `FINNHUB_API_KEY`. Without one these drift within a ±1.4% band on a
  deterministic hourly seed and are **labelled Indicative everywhere they
  appear**. Never present them as tradeable.

`ASSET_CLASSES` in `src/lib/market/types.ts` holds each class's label and, more
importantly, what its price column actually means — a bond row is a yield in
percent, an FX row is one currency in another, an index row is a level. The
board formats each accordingly rather than putting a dollar sign on everything.

---

## Deploying

Two paths, both written out click by click:

- **[HOSTINGER.md](./HOSTINGER.md)** — your own VPS (Hostinger, DigitalOcean,
  Hetzner, anywhere). One command installs Node, PostgreSQL, nginx, PM2 and a
  renewing HTTPS certificate. KYC uploads and rate limiting work as-is, because
  there is one long-lived server with a disk.
- **[DEPLOY.md](./DEPLOY.md)** — Supabase + Vercel, no terminal at all, free to
  start. Move uploads to S3/R2 before going live on it.

The summary either way:

1. Provision PostgreSQL and set `DATABASE_URL` and `DIRECT_URL`.
2. Set `AUTH_SECRET` (`openssl rand -base64 48`) and `NEXT_PUBLIC_SITE_URL`.
3. `npm run db:deploy` to apply migrations, then `npm run db:seed` if you want
   the demo mandates, assets and articles.
4. `npm run build && npm run start`.

### Pooled connections

On a managed provider that pools connections — Supabase, Neon — `DATABASE_URL`
must be the **pooled** endpoint and `DIRECT_URL` the **direct** one. Prisma runs
queries through the pool and migrations through a real session, because a
transaction-mode pooler cannot execute them.

Supabase, from Project Settings → Database:

```
DATABASE_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

The `pgbouncer=true&connection_limit=1` part is not optional: without it
Prisma's prepared statements collide across pooled sessions and you get
intermittent `prepared statement "s0" already exists` errors under load.

Running your own Postgres on a single server? Set both to the same string.

### Moving to your own server later

Nothing here is tied to a specific host. It is a standard Next.js app talking to
Postgres over a connection string, so migrating is: point `DATABASE_URL` and
`DIRECT_URL` at the new database, `npm run db:deploy`, then `npm run build &&
npm run start` behind nginx or a container. Budget an afternoon, not a rewrite.

`deploy/setup-vps.sh` does all of that on a fresh Ubuntu box in one command, and
`deploy/update.sh` redeploys afterwards — pull, migrate, rebuild, reload, with
an automatic rollback if the build fails. See [HOSTINGER.md](./HOSTINGER.md).

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request against a real
PostgreSQL service container: migrate, seed, typecheck, lint, build, then
`verify:ops`. The build genuinely needs the database — plan and article pages
prerender through `generateStaticParams` — so CI exercises the same path a
deployment does.

**Replace file uploads before going live.** `src/lib/uploads.ts` writes KYC
documents to the container filesystem — correct for a single long-lived server,
wrong for serverless or multi-instance, where files written by one instance are
invisible to the next. Swap `saveUpload` for a signed upload straight to S3/R2
and store the object key. Nothing else changes: every other file treats the
return value as an opaque string. Uploads are written outside `public/` and are
never served statically; add an authorised route before reviewers can view them.

**Rate limiting is in-process.** `src/lib/rate-limit.ts` protects a single
instance. Behind more than one, swap the map for Redis — only that file changes.
Auth lockout is also persisted to `login_attempts`, so brute force stays
throttled across instances in the meantime.

---

## Scripts

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Development server                                    |
| `npm run build`      | Generate the Prisma client and build for production    |
| `npm run typecheck`  | `tsc --noEmit`                                        |
| `npm run lint`       | ESLint                                                |
| `npm run db:migrate` | Create and apply a migration                          |
| `npm run db:deploy`  | Apply migrations (production)                         |
| `npm run db:seed`    | Seed plans, assets, articles and demo accounts        |
| `npm run db:studio`  | Prisma Studio                                         |
| `npm run verify:ops` | Exercise every money operation and check the ledger    |

---

## License

Private and unpublished. All rights reserved.
