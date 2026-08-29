# Putting this live on Hostinger

One command, about fifteen minutes, and the site is running on your own server
with your own domain and HTTPS.

---

## First: which Hostinger plan

> **You need a VPS. Web Hosting / Cloud Hosting will not run this app.**

Hostinger's Web Hosting, Premium, Business and Cloud plans run PHP behind
LiteSpeed with MySQL. This app is a Node.js server with PostgreSQL — it needs a
process that stays running and a database those plans do not offer. There is no
workaround, no upload-the-files trick. Buying the wrong plan is the one mistake
that costs real time here.

**Buy:** Hostinger → **VPS Hosting** → **KVM 1** or bigger.

- KVM 1 is enough to run the site comfortably. The setup script adds swap
  automatically if memory is tight, because otherwise the build gets killed
  halfway with nothing but the word `Killed` on screen.
- KVM 2 if you expect real traffic from day one.
- When it asks for an operating system, choose **Ubuntu 24.04** (plain — not a
  panel template, not CyberPanel, not "with cPanel").
- Set a root password when prompted and keep it somewhere safe.

Already have a VPS somewhere else — DigitalOcean, Contabo, Hetzner, AWS? These
steps work there unchanged. Nothing below is Hostinger-specific except where to
click.

---

## 1 · Point your domain at the server

Do this first, so DNS has time to propagate while the server builds.

In hPanel, note your VPS **IP address** (VPS → your server → Overview).

**If your domain is registered with Hostinger:** hPanel → **Domains** → your
domain → **DNS / Nameservers** → **DNS records**. Create or edit:

| Type | Name  | Points to      | TTL     |
| ---- | ----- | -------------- | ------- |
| A    | `@`   | your VPS IP    | 14400   |
| A    | `www` | your VPS IP    | 14400   |

Delete any other `A` or `CNAME` record on `@` or `www` first — two records
fighting over the same name is the usual reason a domain "doesn't work".

**If it is registered elsewhere** (GoDaddy, Namecheap, Cloudflare), add the same
two A records in that registrar's DNS panel. On Cloudflare, set the proxy to
**DNS only** (grey cloud) until HTTPS is issued, then turn it back on if you
want.

No domain yet? Skip this. The site will come up on the raw IP and you can add a
domain later.

---

## 2 · Open a terminal on the server

hPanel → **VPS** → your server → **Browser terminal**.

That gives you a black window in the browser, already logged in as `root`. No
SSH client, no second screen, nothing to install.

Prefer your own terminal? `ssh root@YOUR-SERVER-IP` does the same thing.

---

## 3 · Run one command

Copy this whole block, paste it into that black window, press **Enter**:

```bash
curl -fsSL https://raw.githubusercontent.com/AlBaydoun/Trading/claude/crypto-stocks-investment-platform-4ryd3r/deploy/setup-vps.sh -o setup-vps.sh && bash setup-vps.sh
```

It asks four questions:

| Question                | What to type                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| Your domain             | `yourdomain.com` — no `https://`, no `www`. Blank to use the IP.     |
| Email for the certificate | Your real email. Let's Encrypt warns you here if renewal ever fails. Blank skips HTTPS. |
| Admin login email       | The address you will sign in with. Press Enter to accept the default. |
| Admin password          | 10+ characters, upper and lower case, a number. **Nothing is shown as you type** — that is normal, keep typing. |

Then it runs for roughly ten minutes. It is doing this:

1. Adds swap if the server has little RAM
2. Installs Node 22, PostgreSQL, nginx and PM2
3. Creates the database and a database user with a random password
4. Downloads the code into `/var/www/axiom`
5. Writes `.env` with a freshly generated `AUTH_SECRET`
6. Applies the database schema and loads the mandates, market data and articles
7. Builds the app
8. Starts it under PM2 so it survives crashes and reboots
9. Configures nginx and the firewall
10. Fits a free HTTPS certificate that renews itself

When it finishes it prints your URL and login. **You are live.**

Safe to run again if it stops partway — every step checks whether it is already
done, and it never overwrites your `.env`.

---

## 4 · Straight after it finishes

1. Open the URL it printed and sign in at `/login` with the email and password
   you typed.
2. **Delete the demo accounts.** The seed creates
   `demo@axiomcapital.example`, `admin@axiomcapital.example` and
   `analyst@axiomcapital.example` with published passwords. Remove them in the
   admin console before anyone else has the address.
3. Rename the brand: edit `src/lib/site-config.ts`, push, then run the update
   command in the next section.
4. Read the "Before you accept real money" section of [README.md](./README.md).
   Licensing, legal review and real custody are not optional and are not
   something software can supply.

---

## 5 · Updating the site later

Push your changes to GitHub, then in the same black window:

```bash
cd /var/www/axiom && bash deploy/update.sh
```

That pulls, installs, migrates, rebuilds and reloads. If the new code fails to
build it puts the previous version back, so the site does not go down because of
a typo.

**Changing a setting** (adding an API key, changing the site URL):

```bash
nano /var/www/axiom/.env      # edit, then Ctrl+O, Enter, Ctrl+X
pm2 restart axiom
```

Useful keys:

| Key                | What it does                                                         |
| ------------------ | -------------------------------------------------------------------- |
| `FINNHUB_API_KEY`  | Makes equities, indices, commodities, bonds and property **live**. Without it they are simulated and labelled Indicative. Free tier at finnhub.io. |
| `COINGECKO_API_KEY`| Raises the crypto rate limit. Crypto is already live without it.      |
| `NEXT_PUBLIC_SITE_URL` | Your canonical URL. Wrong value here breaks SEO canonicals and OG images. |

---

## 6 · Day-to-day commands

| What you want            | Command                                        |
| ------------------------ | ---------------------------------------------- |
| Is it running?           | `pm2 status`                                   |
| See what it is doing     | `pm2 logs axiom`                               |
| Restart it               | `pm2 restart axiom`                            |
| Check the ledger balances| `cd /var/www/axiom && npm run verify:ops`      |
| Back up the database     | `sudo -u postgres pg_dump axiom > ~/axiom-$(date +%F).sql` |

**Set up a nightly backup** — one line, paste it once:

```bash
(crontab -l 2>/dev/null; echo '0 3 * * * sudo -u postgres pg_dump axiom | gzip > /root/axiom-$(date +\%F).sql.gz && find /root -name "axiom-*.sql.gz" -mtime +14 -delete') | crontab -
```

That keeps a compressed dump every night at 03:00 and throws away anything older
than a fortnight. Also turn on Hostinger's own VPS snapshots (VPS → Snapshots &
Backups) — a database dump does not save you from a deleted server.

---

## When something is wrong

| What you see                          | What it means and what to do                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **502 Bad Gateway**                   | nginx is up, the app is not. `pm2 logs axiom` shows why — nearly always a bad `DATABASE_URL` in `.env`.          |
| **The site does not load at all**     | DNS has not propagated. Try the raw IP. If the IP works, wait — up to a few hours.                              |
| **Certificate failed** during setup   | DNS was not pointing at the server yet. Fix the A records, wait, then: `certbot --nginx -d yourdomain.com`      |
| **`Killed` during the build**         | Out of memory. The script adds swap, but if you deleted it: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`, then re-run. |
| **Prices look frozen**                | Working as intended — quotes refresh at most every 5 minutes. Equities are simulated until you add a Finnhub key. |
| **Forgot the admin password**         | `cd /var/www/axiom && npm run db:studio` opens the database in a browser; or seed a new admin by setting `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env` and running `npm run db:seed`. |
| **Browser terminal closed mid-build** | The build died with it. Re-run the setup command — it picks up where it stopped. |

---

## The files that do this

All four live in `deploy/` and are already in the repository — you do not need
to create or upload anything.

| File                          | What it is                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `deploy/setup-vps.sh`         | The one-shot installer. Everything in step 3.                                  |
| `deploy/update.sh`            | Redeploy after a code change, with automatic rollback on a failed build.       |
| `deploy/ecosystem.config.cjs` | PM2's process definition — one instance, restart on crash, logs to `/var/log/axiom`. |
| `deploy/nginx.conf.template`  | The nginx site. Rendered with your domain and port during setup.               |

Two things are deliberately **single-server**: rate limiting is held in memory
and KYC uploads are written to local disk. Both are correct here and both break
if you ever run two instances behind a load balancer — swap in Redis and S3
first. `README.md` says which files to change.

---

## Hostinger versus Vercel

You can run both. They are not exclusive.

|                          | Hostinger VPS                      | Vercel + Supabase ([DEPLOY.md](./DEPLOY.md)) |
| ------------------------ | ---------------------------------- | -------------------------------------------- |
| Cost                     | One monthly VPS bill               | Free to start                                 |
| Setup                    | One command                        | Clicking through two dashboards               |
| KYC file uploads         | Work as-is                         | Need S3/R2 first — serverless has no disk     |
| Rate limiting            | Works as-is                        | Needs Redis across instances                  |
| Scaling                  | You resize the VPS                 | Automatic                                     |
| Database                 | On the same box, no network hop    | Managed, backed up for you                    |

For an investment platform holding client records, the VPS is the simpler
honest answer: one machine, one database, files on disk, a ledger you can dump
and inspect. Move to managed infrastructure when traffic makes you.
