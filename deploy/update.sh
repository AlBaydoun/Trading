#!/usr/bin/env bash
#
# Deploy the latest code to a server that setup-vps.sh has already prepared.
#
#   cd /var/www/axiom && bash deploy/update.sh
#
# Pulls the branch this checkout is on, installs, migrates, rebuilds, then
# reloads PM2. If the build fails the previous commit is restored and rebuilt,
# so the site keeps serving the version it was serving before.

set -euo pipefail

APP_NAME="axiom"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

say()  { printf "\n\033[1;36m▸ %s\033[0m\n" "$1"; }
ok()   { printf "  \033[0;32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[0;33m!\033[0m %s\n" "$1"; }
die()  { printf "\n\033[0;31m✗ %s\033[0m\n\n" "$1" >&2; exit 1; }

[ -f .env ] || die "No .env in ${APP_DIR}. Run deploy/setup-vps.sh first."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
PREVIOUS="$(git rev-parse HEAD)"

say "Fetching ${BRANCH}"
for attempt in 1 2 3 4; do
  if git fetch origin "$BRANCH" --quiet; then break; fi
  [ "$attempt" -eq 4 ] && die "Could not reach the repository after four tries."
  warn "Fetch failed — retrying in $((2 ** attempt))s"
  sleep $((2 ** attempt))
done

if [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/${BRANCH}")" ]; then
  ok "Already up to date ($(git log -1 --format=%s))"
  UP_TO_DATE=1
else
  git reset --hard "origin/${BRANCH}" --quiet
  ok "Now on $(git log -1 --format='%h %s')"
  UP_TO_DATE=0
fi

build_current() {
  # Chained rather than one per line: `set -e` is suspended inside a function
  # used as an `if` condition, so a bare list would carry on past a failure.
  npm ci --no-audit --no-fund >/dev/null \
    && npx prisma migrate deploy >/dev/null \
    && npm run build >/dev/null
}

if [ "$UP_TO_DATE" -eq 0 ] || [ ! -d .next ]; then
  say "Installing, migrating and building (a few minutes)"
  if build_current; then
    ok "Built"
  else
    warn "Build failed — rolling back to ${PREVIOUS:0:7}"
    git reset --hard "$PREVIOUS" --quiet
    build_current >/dev/null 2>&1 || die \
      "Rollback build also failed. The site may be down. Check: pm2 logs ${APP_NAME}"
    warn "Rolled back. The old version is being restored; fix the code and re-run."
  fi
else
  ok "Nothing to rebuild"
fi

say "Reloading"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env >/dev/null
else
  pm2 start deploy/ecosystem.config.cjs >/dev/null
fi
pm2 save >/dev/null
ok "PM2 reloaded"

# Give the server a moment, then check it actually answers.
PORT="$(grep -oP '(?<=^PORT=)\d+' .env 2>/dev/null || echo 3000)"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/" || echo 000)"
  [ "$CODE" = "200" ] && break
  sleep 2
done

if [ "$CODE" = "200" ]; then
  printf "\n\033[1;32m✓ Live — homepage returned 200\033[0m\n\n"
else
  printf "\n\033[0;31m✗ Homepage returned %s. Check:  pm2 logs %s\033[0m\n\n" "$CODE" "$APP_NAME"
  exit 1
fi
