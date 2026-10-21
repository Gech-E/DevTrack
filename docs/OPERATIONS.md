# DevTrack operations runbook

How to deploy, configure, monitor and recover DevTrack. For local development see the
[README](../README.md).

## Architecture in one paragraph

Two stateless containers (`api`, `web`) and one PostgreSQL database. The web app is a Next.js
server that calls the API from the browser; the API owns all data. Everything stateful is in
Postgres: users, projects, tasks, goals, refresh tokens and password-reset tokens.

## Required configuration

The API validates its environment at boot and **exits non-zero with a list of every problem**
if it is wrong. In production (`NODE_ENV=production`, which the image sets) it additionally
refuses to start unless:

| Variable       | Production requirement                                            |
| -------------- | ----------------------------------------------------------------- |
| `DATABASE_URL` | `postgres://` or `postgresql://` connection string                |
| `JWT_SECRET`   | at least 32 characters, not a known default, not low-entropy      |
| `CORS_ORIGINS` | comma-separated `https://` web origins, no wildcards and no paths |
| `WEB_APP_URL`  | absolute URL of the web app (used in password-reset emails)       |
| `MAIL_*`       | `RESEND_API_KEY` and `MAIL_FROM` if `MAIL_TRANSPORT=resend`       |

Generate a secret with `openssl rand -base64 48`. Rotating `JWT_SECRET` signs everyone out
within 15 minutes (access tokens expire); refresh tokens are not affected because they are
random values stored hashed in the database.

The web image bakes `NEXT_PUBLIC_API_URL` into the client bundle **at build time**, and the
build fails if it is missing. Set it at runtime as well so the Content-Security-Policy allows
calls to the API origin.

`TRUST_PROXY_HOPS` must equal the number of reverse proxies in front of the API (usually `1`).
Without it, every client appears to have the proxy's IP and rate limits are shared by everyone.

## Deploying

### Images

Tag a release to build and publish both images to GitHub Container Registry:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

The `Release` workflow needs the repository variable `NEXT_PUBLIC_API_URL`. If you set the
optional secret `DEPLOY_HOOK_URL` it is POSTed after publishing, which most platforms
(Render, Railway, Coolify, Fly machines behind a hook) accept as "redeploy now".

### Migrations

The API image runs `prisma migrate deploy` before starting. That is safe for a single
instance. With more than one replica, run it once per release instead (a one-off container with
the same image and `DATABASE_URL`) and start the replicas with `node dist/main.js` only.
Migrations are written to be backwards compatible with the previous release for one version, so
a rolling deploy does not need downtime.

### Single machine

`pnpm deploy:up` builds and runs Postgres, API and web with Docker Compose. Put a TLS-terminating
reverse proxy (Caddy, nginx, Traefik) in front, set `TRUST_PROXY_HOPS=1`, and set a real
`POSTGRES_PASSWORD`. Postgres is published on `127.0.0.1` only.

## Health checks

| Endpoint            | Meaning                                       | Use for                           |
| ------------------- | --------------------------------------------- | --------------------------------- |
| `GET /health/live`  | The process is running                        | Liveness probe / container health |
| `GET /health/ready` | The database answers (`503` when it does not) | Readiness probe, load balancer    |
| `GET /health`       | Same as `/health/ready`                       | Existing probes                   |

Liveness deliberately never touches the database, so a database outage does not make the
platform restart healthy API containers in a loop.

## Logs and tracing

- Production logs are one JSON object per line (`level`, `time`, `context`, `message`).
- Every request has an id: pass `X-Request-Id` and it is kept, otherwise one is generated. It is
  returned in the `X-Request-Id` header and in the `requestId` field of every error body, so a
  user report ("it failed, id abc123") maps straight to a log line.
- Unexpected errors (HTTP 5xx) are logged with their stack trace; clients only see
  `Internal server error`.

Error tracking (Sentry or similar) is not wired in because it needs an extra dependency and an
account. The JSON logs and request ids are enough to alert on `"level":"error"` in the meantime.

## Rate limiting

Counters live in API process memory (per client IP, per route group). Defaults:

| Bucket      | Routes                                                 | Default             |
| ----------- | ------------------------------------------------------ | ------------------- |
| `auth`      | register, login, refresh, logout                       | 20 / minute / route |
| `sensitive` | forgot/reset password, change password, delete account | 5 / minute / route  |
| `global`    | everything else                                        | 300 / minute        |

With several API replicas each one counts separately, so the effective limit is multiplied by
the replica count. If you scale out, move the store behind `RateLimitStore.hit` to Redis.

## Backups and restore

**Primary:** use a managed Postgres with point-in-time recovery (Neon, Supabase, RDS, Cloud SQL)
and enable it. That is the only option that protects against "the bad deploy was 10 minutes
ago".

**Independent copy:** `scripts/pg-backup.sh` writes a compressed `pg_dump`, verifies that it can
be read, and prunes old files.

```bash
DATABASE_URL=postgresql://user:pass@host:5432/devtrack scripts/pg-backup.sh /var/backups/devtrack 14
```

Run it daily from cron or a scheduled job and copy the result off the machine (object storage).

**Rehearse a restore** into a scratch database before you need it:

```bash
createdb devtrack_restore_test
DATABASE_URL=postgresql://user:pass@host:5432/devtrack_restore_test \
  scripts/pg-restore.sh /var/backups/devtrack/devtrack-20261021T020000Z.dump
```

Restoring into production drops and recreates every object in the dump. Stop the API first.

## Security notes

- Access tokens last 15 minutes; refresh tokens last 7 days, are stored hashed, and rotate on
  every use. Presenting an already-rotated token more than 10 seconds later revokes **all** of
  that user's sessions (theft detection).
- Tokens are held in the browser's `localStorage`, so an XSS bug would expose them. The
  Content-Security-Policy blocks third-party scripts, framing and plugins, but it allows
  `'unsafe-inline'` scripts because Next.js emits inline bootstrap code; moving to a nonce-based
  policy is the next hardening step. If you want to remove the XSS exposure entirely, move the
  refresh token to an `httpOnly; Secure; SameSite=Strict` cookie.
- Registration reveals whether an email is already taken (HTTP 409). The rate limiter bounds
  enumeration; closing it fully needs email verification, which is not implemented.
- Password-reset links are sent by email and are valid for one hour and one use. With
  `MAIL_TRANSPORT=log` in production **no email is delivered**; configure `resend`.

## Launch checklist

- [ ] `JWT_SECRET`, `POSTGRES_PASSWORD` and every other secret are unique and stored in your
      platform's secret manager, not in the repository
- [ ] `CORS_ORIGINS`, `WEB_APP_URL`, `NEXT_PUBLIC_API_URL` use `https://` URLs
- [ ] `TRUST_PROXY_HOPS` matches your proxy setup
- [ ] Mail transport configured and a real password reset tested end to end
- [ ] Postgres point-in-time recovery enabled; a backup restored into a scratch database
- [ ] Alert on `/health/ready` failing and on `"level":"error"` log lines
- [ ] Privacy policy and terms (`/privacy`, `/terms`) reviewed by someone qualified, and
      `NEXT_PUBLIC_CONTACT_EMAIL` set
- [ ] The demo seed has **not** been run against the production database
