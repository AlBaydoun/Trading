#!/usr/bin/env bash
#
# One-shot setup for a fresh Ubuntu VPS (Hostinger KVM, DigitalOcean, Contabo,
# Hetzner — any of them). Installs Node, PostgreSQL, nginx and PM2, creates the
# database, builds the app, starts it under a process manager that survives
# reboots, and fits an HTTPS certificate.
#
# Run it once, as root:
#
#   bash setup-vps.sh
#
# Safe to re-run: every step checks whether it has already been done.

set -euo pipefail

APP_NAME="axiom"
APP_DIR="/var/www/${APP_NAME}"
REPO_URL="https://github.com/AlBaydoun/Trading.git"
BRANCH="claude/crypto-stocks-investment-platform-4ryd3r"
NODE_MAJOR="22"
DB_NAME="axiom"
DB_USER="axiom"
# nginx is rendered from this. Change it and change deploy/ecosystem.config.cjs
# to match, or nginx will proxy to a port nothing is listening on.
PORT="3000"

say()  { printf "\n\033[1;36m▸ %s\033[0m\n" "$1"; }
ok()   { printf "  \033[0;32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[0;33m!\033[0m %s\n" "$1"; }
die()  { printf "\n\033[0;31m✗ %s\033[0m\n\n" "$1" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run this as root:  sudo bash setup-vps.sh"

# ---------------------------------------------------------------- questions --
say "Setup"

read -rp "  Your domain (e.g. axiomcapital.com), or blank to use the IP: " DOMAIN
DOMAIN="${DOMAIN// /}"

read -rp "  Email for the HTTPS certificate (blank to skip HTTPS): " LE_EMAIL
LE_EMAIL="${LE_EMAIL// /}"

read -rp "  Admin login email [admin@${DOMAIN:-example.com}]: " ADMIN_EMAIL
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${DOMAIN:-example.com}}"

read -rsp "  Admin password (10+ chars, upper, lower, a number): " ADMIN_PASSWORD
echo
[ ${#ADMIN_PASSWORD} -ge 10 ] || die "That password is under 10 characters."

SERVER_IP="$(hostname -I | awk '{print $1}')"
SITE_HOST="${DOMAIN:-$SERVER_IP}"
SITE_URL="http://${SITE_HOST}"
[ -n "$LE_EMAIL" ] && [ -n "$DOMAIN" ] && SITE_URL="https://${DOMAIN}"

# ---------------------------------------------------------------------- swap --
# `next build` needs well over 1 GB. On the smaller VPS plans it gets killed
# with a bare "Killed" and no explanation, so guarantee some swap first.
say "Memory"
TOTAL_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MB" -lt 3000 ] && [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "Added 2 GB swap (RAM is ${TOTAL_MB} MB — the build would otherwise be killed)"
else
  ok "Memory is fine (${TOTAL_MB} MB)"
fi

# ------------------------------------------------------------------ packages --
say "Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates gnupg ufw ripgrep >/dev/null 2>&1 || \
  apt-get install -y -qq curl git ca-certificates gnupg ufw >/dev/null
ok "Base tools"

if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs >/dev/null
fi
ok "Node $(node -v)"

if ! command -v psql >/dev/null; then
  apt-get install -y -qq postgresql postgresql-contrib >/dev/null
fi
systemctl enable --now postgresql >/dev/null 2>&1
ok "PostgreSQL running"

if ! command -v nginx >/dev/null; then
  apt-get install -y -qq nginx >/dev/null
fi
systemctl enable --now nginx >/dev/null 2>&1
ok "nginx running"

command -v pm2 >/dev/null || npm install -g pm2 >/dev/null 2>&1
ok "PM2 $(pm2 -v 2>/dev/null || echo installed)"

# ------------------------------------------------------------------ database --
say "Database"
if su postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'\"" | grep -q 1; then
  ok "Role ${DB_USER} already exists — keeping its password"
  DB_PASSWORD="$(grep -oP '(?<=postgresql://'"${DB_USER}"':)[^@]+' "${APP_DIR}/.env" 2>/dev/null || true)"
  [ -n "$DB_PASSWORD" ] || die "Role exists but its password is not in ${APP_DIR}/.env. Delete the role or restore the file."
else
  DB_PASSWORD="$(openssl rand -hex 24)"
  su postgres -c "psql -q -c \"CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';\""
  ok "Created role ${DB_USER}"
fi

su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\"" | grep -q 1 \
  || su postgres -c "createdb -O ${DB_USER} ${DB_NAME}"
ok "Database ${DB_NAME} ready"

# --------------------------------------------------------------------- code --
say "Application"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH" --quiet
  git -C "$APP_DIR" reset --hard "origin/${BRANCH}" --quiet
  ok "Updated existing checkout"
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  ok "Cloned into ${APP_DIR}"
fi

cd "$APP_DIR"

# .env is never overwritten — a re-run must not invalidate everyone's session.
if [ ! -f .env ]; then
  AUTH_SECRET="$(openssl rand -base64 48)"
  cat > .env <<ENVFILE
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}?schema=public"
DIRECT_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}?schema=public"
NEXT_PUBLIC_SITE_URL="${SITE_URL}"
AUTH_SECRET="${AUTH_SECRET}"
SEED_ADMIN_EMAIL="${ADMIN_EMAIL}"
SEED_ADMIN_PASSWORD="${ADMIN_PASSWORD}"
NODE_ENV="production"
ENVFILE
  chmod 600 .env
  ok "Wrote .env"
else
  ok ".env already exists — left untouched"
fi

say "Building (a few minutes — this is the slow part)"
npm ci --no-audit --no-fund >/dev/null
npx prisma migrate deploy >/dev/null
ok "Database schema applied"

if [ "$(su postgres -c "psql -tAc 'SELECT count(*) FROM investment_plans' ${DB_NAME}" 2>/dev/null || echo 0)" -eq 0 ]; then
  npm run db:seed >/dev/null
  ok "Seeded mandates, market data, articles and the admin account"
else
  ok "Data already present — skipped seeding"
fi

npm run build >/dev/null
ok "Built"

# ------------------------------------------------------------------ process --
say "Starting the app"
mkdir -p /var/log/"${APP_NAME}"
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
pm2 start deploy/ecosystem.config.cjs >/dev/null
pm2 save >/dev/null
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
ok "Running under PM2, and it will come back after a reboot"

# -------------------------------------------------------------------- nginx --
say "Web server"
sed "s/__SERVER_NAME__/${SITE_HOST}/g; s/__PORT__/${PORT}/g" \
  deploy/nginx.conf.template > "/etc/nginx/sites-available/${APP_NAME}"
ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 || die "nginx rejected the config. Run 'nginx -t' to see why."
systemctl reload nginx
ok "nginx proxying ${SITE_HOST} to the app"

ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
yes | ufw enable >/dev/null 2>&1 || true
ok "Firewall open on SSH, HTTP and HTTPS only"

# ---------------------------------------------------------------------- ssl --
if [ -n "$DOMAIN" ] && [ -n "$LE_EMAIL" ]; then
  say "HTTPS certificate"
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  if certbot --nginx -d "$DOMAIN" -d "www.${DOMAIN}" \
       --non-interactive --agree-tos -m "$LE_EMAIL" --redirect >/dev/null 2>&1; then
    ok "HTTPS live and set to renew automatically"
  else
    warn "Certificate failed — almost always DNS not pointing here yet."
    warn "Point the domain at ${SERVER_IP}, wait, then run:  certbot --nginx -d ${DOMAIN}"
  fi
fi

# -------------------------------------------------------------------- done --
printf "\n\033[1;32m════════════════════════════════════════════════\033[0m\n"
printf "\033[1;32m  Live at %s\033[0m\n" "$SITE_URL"
printf "\033[1;32m════════════════════════════════════════════════\033[0m\n\n"
printf "  Admin console   %s/login\n" "$SITE_URL"
printf "  Email           %s\n" "$ADMIN_EMAIL"
printf "  Password        the one you typed above\n\n"
printf "  Logs            pm2 logs %s\n" "$APP_NAME"
printf "  Restart         pm2 restart %s\n" "$APP_NAME"
printf "  Update later    cd %s && bash deploy/update.sh\n\n" "$APP_DIR"
printf "  \033[0;33mDelete the demo accounts before this takes real money.\033[0m\n\n"
