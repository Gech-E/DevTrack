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

### Vercel (Web)

1. Import the repo in Vercel; set root to monorepo.
2. Use `apps/web/vercel.json` (or Framework Preset Next.js with install/build commands below).
3. Env: `NEXT_PUBLIC_API_URL=https://your-api.up.railway.app`
4. Build: `pnpm --filter @devtrack/shared build && pnpm --filter @devtrack/web build`

Install command: `pnpm install --frozen-lockfile`

After deploy, add the Vercel origin to API `CORS_ORIGINS` and use `SameSite=None; Secure` cookies (enabled when `NODE_ENV=production`).

## Tests

```bash
pnpm test
pnpm test:e2e:api
pnpm test:e2e
```

## Status

Roadmap complete, plus refresh cookies, goal↔project linking, UI redesign, and Railway/Vercel deploy configs.
