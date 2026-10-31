# DevTrack

Personal developer learning and task management application.

This repository is a **pnpm monorepo** with a Next.js frontend (`apps/web`) and a NestJS API (`apps/api`).

## Stack

- Next.js + TypeScript + Tailwind CSS + shadcn-style UI primitives
- NestJS + PostgreSQL + Prisma
- JWT access + rotating refresh tokens in **httpOnly cookies**
- Jest (API unit + integration, web RTL)
- Playwright (browser e2e)
- Docker Compose / Railway / Vercel
- GitHub Actions CI
- pnpm workspaces

## Setup

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev:api
pnpm dev:web
```

Seed user: `demo@devtrack.local` / `password123`

## Auth (httpOnly cookies)

Login/register set `devtrack_access` (15m) and `devtrack_refresh` (7d, hashed in DB, rotated).  
The browser sends cookies automatically (`credentials: 'include'`). Bearer tokens still work for API tooling/tests.

| Method | Path                    | Notes                                   |
| ------ | ----------------------- | --------------------------------------- |
| `POST` | `/api/v1/auth/register` | Sets cookies; body `{ user }`           |
| `POST` | `/api/v1/auth/login`    | Sets cookies; body `{ user }`           |
| `POST` | `/api/v1/auth/refresh`  | Cookie or body refresh; rotates cookies |
| `POST` | `/api/v1/auth/logout`   | Revokes + clears cookies                |
| `GET`  | `/api/v1/auth/me`       | Cookie or Bearer                        |

## API resources

| Resource       | Base path                                   |
| -------------- | ------------------------------------------- |
| Projects       | `/api/v1/projects`                          |
| Tasks          | `/api/v1/projects/:projectId/tasks`         |
| Learning goals | `/api/v1/goals` (optional `projectId` link) |

## Deploy

### Docker (local / VPS)

```bash
pnpm deploy:up
pnpm deploy:down
```

Env: `JWT_SECRET`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`

### Railway (API)

1. Create a Railway project from this repo.
2. Add a Postgres plugin; set `DATABASE_URL`.
3. Set `JWT_SECRET`, `CORS_ORIGINS` (your Vercel URL), `API_PORT=3001`.
4. Deploy using the root `Dockerfile` **api** target (or `railway.toml`).
5. Health check: `/health`

### Vercel (Web + API Services)

This repository includes a root `vercel.json` that defines two services in **one Vercel project**:

- `web` (Next.js) serves the site at `/`.
- `api` (NestJS) serves `/api/v1/*` and `/health` on the same origin.

The frontend calls the API through relative same-origin paths in production. There are **no internal service bindings**: the current application sends API calls from the browser, not from Next.js server functions. If a server-side service call is added later, declare a service binding on the caller, and use its injected URL only at runtime.

1. Import this repository into Vercel and choose the repository root (`.`) as the project's root directory. Keep one Vercel project for both services.
2. In the Vercel project settings, set `DATABASE_URL` (an external production PostgreSQL connection string) and a strong `JWT_SECRET`. Never commit secrets.
3. Do not set `NEXT_PUBLIC_API_URL` in production; the browser uses the same-origin `/api/v1` paths by default. Local development still defaults to `http://localhost:3001`.
4. Run `pnpm --filter @devtrack/api prisma:deploy` once against the production database as a controlled migration step before enabling application traffic. Avoid automatically applying migrations from each deployment instance.
5. Deploy a preview, test `/health`, registration/login, project creation, refresh/logout cookies and authenticated API calls; then promote after reviewing the deployment.

Build commands for each service are declared in the root `vercel.json` and compile the shared workspace package. NestJS uses `apps/api/src/app.ts` as a Vercel-recognizable entrypoint and respects Vercel's `PORT` variable.

Run `vercel dev` from the repository root to test routing locally. The existing Docker Compose, Railway and local development configurations remain available.

## Tests

```bash
pnpm test
pnpm test:e2e:api
pnpm test:e2e
```

## Status

Roadmap complete, plus refresh cookies, goal↔project linking, UI redesign, and Railway/Vercel deploy configs.
