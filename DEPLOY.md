# Deploying — step by step

Getting from the repository to a live URL. About 20 minutes, no terminal
required. Free on both services.

You will use two things:

- **Supabase** — the PostgreSQL database (and later, storage for KYC documents)
- **Vercel** — runs the app itself

---

## 1 · Get your two connection strings from Supabase

Open your `trading` project.

1. Click **Connect** at the top of the page (next to the project name).
2. You will see several connection strings. You need **two of them**.

**DATABASE_URL** — the "Transaction pooler" string, port **6543**:

```
postgresql://postgres.abcdefgh:YOUR-PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

Then **add this to the end** — it is not optional:

```
?pgbouncer=true&connection_limit=1
```

So the finished value looks like:

```
postgresql://postgres.abcdefgh:YOUR-PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**DIRECT_URL** — the "Session pooler" string, port **5432**:

```
postgresql://postgres.abcdefgh:YOUR-PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

No extra parameters on this one.

> **Use the Session pooler, not "Direct connection".** The direct
> `db.<ref>.supabase.co` host is IPv6-only on the free tier, and both GitHub
> Actions and Vercel connect over IPv4. You would get a connection timeout with
> no useful error message. The session pooler does the same job over IPv4.

Replace `YOUR-PASSWORD` with your database password in **both** strings. If you
did not save it: Project Settings → Database → Reset database password.

> **Two connection strings, because they do different jobs.** Ordinary queries
> go through the transaction pooler, which handles many short connections
> efficiently. Migrations cannot run through it — they need a real session — so
> they use the session pooler instead. Prisma switches between them
> automatically.

---

## 2 · Create the tables and demo data

You can do this from GitHub without installing anything.

**Add three repository secrets.** In your repo: **Settings → Secrets and
variables → Actions → New repository secret**. Add:

| Name                  | Value                                             |
| --------------------- | ------------------------------------------------- |
| `DATABASE_URL`        | the pooler string from step 1 (with `?pgbouncer=…`) |
| `DIRECT_URL`          | the session pooler string from step 1              |
| `SEED_ADMIN_PASSWORD` | a password you choose for the admin account        |

Make `SEED_ADMIN_PASSWORD` a real password — at least 10 characters with upper
case, lower case and a number. This is the login for the admin console.

**Run the setup.** Go to the **Actions** tab → **Database setup** in the left
sidebar → **Run workflow** on the right → leave "Also seed…" ticked → green
**Run workflow** button.

It takes about a minute. When it finishes you will have every table, five
investment mandates, market assets, six articles, and your admin account. The
last step verifies the ledger reconciles, so a green tick means the accounting
is sound.

---

## 3 · Deploy on Vercel

1. Go to **vercel.com** and sign in **with GitHub**.
2. **Add New… → Project**, then import `AlBaydoun/Trading`.
3. Under **Environment Variables**, add three:

| Name                  | Value                                     |
| --------------------- | ----------------------------------------- |
| `DATABASE_URL`        | same pooler string as before               |
| `DIRECT_URL`          | same session pooler string                 |
| `AUTH_SECRET`         | a long random string — see below           |

For `AUTH_SECRET`, use any 40+ character random string. If you have a terminal:
`openssl rand -base64 48`. If not, use a password generator set to maximum
length. It signs session cookies — changing it later signs everyone out, so set
it once and keep it.

You do **not** need `NEXT_PUBLIC_SITE_URL` yet. Vercel provides its own URL and
the app picks it up automatically. Add it later when you have a custom domain.

4. Click **Deploy** and wait two or three minutes.

Vercel gives you a URL like `https://trading-xyz.vercel.app`. Open it — the site
is live.

---

## 4 · Sign in and check it worked

- **Investor view:** `demo@axiomcapital.example` / `Demo!2024Investor`
- **Admin console:** the email you chose in step 2, with your
  `SEED_ADMIN_PASSWORD`

Worth clicking through, in this order:

1. **`/`** — the 3D hero should render and the price ticker should scroll.
2. **`/markets`** — live crypto prices, pulled from CoinGecko.
3. **Sign in as admin → `/admin`** — the banner at the top should read "Ledger
   reconciles". That is the whole accounting system checking itself.
4. **`/admin/deposits`** — there should be one pending deposit waiting. Approve
   it, then look at `/admin/ledger` to see the journal entry it posted.

If the admin overview says the ledger does **not** reconcile, stop and tell me —
that would mean something went wrong in the seed, and it is the one error worth
treating as urgent.

---

## 5 · Custom domain, when you have one

1. In Vercel: **Project → Settings → Domains → Add**, enter your domain.
2. Vercel shows you the DNS records; add them at your registrar.
3. Once it verifies, add one more environment variable:
   `NEXT_PUBLIC_SITE_URL = https://yourdomain.com`
4. Redeploy.

That last variable matters for SEO — it sets the canonical URLs, the sitemap and
the social preview images. Until it is set, those point at the `.vercel.app`
address.

---

## Common problems

**Build fails with "Can't reach database server"** — the connection string is
wrong, or you used the IPv6-only direct host. Use the session pooler for
`DIRECT_URL`.

**"prepared statement s0 already exists"** — `DATABASE_URL` is missing
`?pgbouncer=true&connection_limit=1`.

**"Tenant or user not found"** — the username must be the full
`postgres.<project-ref>`, not just `postgres`. Copy the whole string from the
Connect dialog rather than typing it.

**Site loads but every page 500s** — migrations have not run. Do step 2.

**Prices show but look stale** — expected. Crypto refreshes every couple of
minutes; equities are indicative unless you add a `FINNHUB_API_KEY`.

**Supabase project paused** — free projects pause after a week idle. Open the
dashboard and hit Restore.

---

## Before real money touches this

Repeating the README, because it is the part that matters most:

1. **Get licensed.** Taking money from the public to invest is regulated
   essentially everywhere.
2. **Have a lawyer review** the documents in `src/lib/content/legal.ts`. They
   render a "pending legal review" banner until you mark them reviewed.
3. **Move off the free tier**, onto a paid plan with the region pinned to your
   licensing jurisdiction — data residency is usually a licence condition.
4. **Replace file uploads** with Supabase Storage or S3. KYC documents currently
   write to the server's disk, which does not survive a redeploy on Vercel.
5. **Change every seeded password**, and delete the demo accounts.
