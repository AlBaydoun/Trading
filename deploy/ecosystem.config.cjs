/**
 * PM2 process definition.
 *
 * PM2 keeps the app running after you close the terminal, restarts it if it
 * crashes, and brings it back after a reboot (`pm2 startup` + `pm2 save`).
 *
 * Start it from the project root:
 *
 *   pm2 start deploy/ecosystem.config.cjs
 *
 * One instance on purpose. Two things in this app are per-process:
 * `src/lib/rate-limit.ts` keeps its counters in memory, and `src/lib/uploads.ts`
 * writes KYC documents to the local disk. Both are correct on a single
 * long-lived server and wrong across a cluster. Move rate limiting to Redis and
 * uploads to S3/R2 before raising `instances`.
 */

const path = require("node:path");

const root = path.resolve(__dirname, "..");
const logDir = "/var/log/axiom";

module.exports = {
  apps: [
    {
      name: "axiom",
      cwd: root,

      // Call Next's binary directly rather than going through `npm run start`,
      // so PM2 supervises the server itself instead of an npm wrapper that
      // swallows signals.
      script: path.join(root, "node_modules/next/dist/bin/next"),
      // Bind to loopback so the only way in is through nginx — `next start`
      // defaults to 0.0.0.0 and has no env fallback for the hostname, so this
      // has to be a flag. If you change the port, change it in
      // deploy/setup-vps.sh too: nginx is rendered from the value there.
      args: "start -H 127.0.0.1 -p 3000",
      interpreter: "node",

      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "20s",
      restart_delay: 2000,

      // A leak would otherwise take the box down with it.
      max_memory_restart: "1G",

      // DATABASE_URL, AUTH_SECRET and the rest live in .env at the project
      // root; Next reads that file itself on start, so secrets never end up in
      // this checked-in file or in `pm2 describe` output.
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      out_file: path.join(logDir, "out.log"),
      error_file: path.join(logDir, "error.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
