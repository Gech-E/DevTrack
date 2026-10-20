# DevTrack

Personal developer learning and task management application.

This repository is a **pnpm monorepo** with a Next.js frontend (`apps/web`) and a NestJS API (`apps/api`).

## Stack

- Next.js + TypeScript + Tailwind CSS + shadcn-style UI primitives
- NestJS + PostgreSQL + Prisma
- JWT access tokens + rotating refresh tokens
- Jest (API unit + integration, web RTL)
- Playwright (browser e2e)
- Docker Compose (Postgres locally; full stack via profile)
- GitHub Actions CI
- pnpm workspaces

## Repository structure

```text
DevTrack/
├── apps/
│   ├── web/          # Next.js UI
│   └── api/          # NestJS API + Prisma
├── packages/
│   ├── shared/       # Shared types/constants (framework-free)
│   ├── eslint-config/
│   └── tsconfig/
├── e2e/              # Playwright browser tests
├── .github/workflows/
├── Dockerfile        # Multi-stage api + web images
├── docker-compose.yml
└── package.json
```

## Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable` then `corepack prepare pnpm@9.15.0 --activate`)
- Docker Desktop
- Playwright browsers once: `pnpm exec playwright install chromium`

## Setup

```bash
# From repo root
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

## Start PostgreSQL (local)

```bash
pnpm db:up
```

> Host `DATABASE_URL` uses `localhost:55432`. Inside Compose, use host `postgres:5432`.

## Start API / web (local)

```bash
pnpm dev:api   # http://localhost:3001/health
pnpm dev:web   # http://localhost:3000
```

Routes: `/login`, `/register`, `/projects`, `/projects/:id`, `/goals`

Seed user: `demo@devtrack.local` / `password123`

## Auth

| Method | Path                    | Description                           |
| ------ | ----------------------- | ------------------------------------- |
| `POST` | `/api/v1/auth/register` | `{ accessToken, refreshToken, user }` |
| `POST` | `/api/v1/auth/login`    | same                                  |
| `POST` | `/api/v1/auth/refresh`  | rotate refresh → new token pair       |
| `POST` | `/api/v1/auth/logout`   | revoke refresh token (`204`)          |
| `GET`  | `/api/v1/auth/me`       | Bearer access token                   |

Access JWTs expire in **15 minutes**. Refresh tokens last **7 days**, are stored hashed, and rotate on each refresh.

## Projects / tasks / goals

All require Bearer JWT and are scoped to the authenticated user (foreign ids → `404`).

| Resource       | Base path                           |
| -------------- | ----------------------------------- |
| Projects       | `/api/v1/projects`                  |
| Tasks          | `/api/v1/projects/:projectId/tasks` |
| Learning goals | `/api/v1/goals`                     |

Goal status: `NOT_STARTED` \| `ACTIVE` \| `COMPLETED`

## Deploy with Docker

```bash
# Build and run postgres + api + web
pnpm deploy:up

# Stop app profile (keeps volumes)
pnpm deploy:down
```

Set secrets in `.env` before deploying:

```bash
JWT_SECRET=use-a-long-random-string
CORS_ORIGINS=https://your-frontend.example
NEXT_PUBLIC_API_URL=https://your-api.example
```

- API image runs `prisma migrate deploy` on start
- Web image bakes `NEXT_PUBLIC_API_URL` at build time
- Default local URLs: web `http://localhost:3000`, api `http://localhost:3001`

## Tests

```bash
pnpm test
pnpm test:e2e:api
pnpm test:e2e
```

## CI

GitHub Actions on `push`/`pull_request` to `main`: migrate, lint, typecheck, unit tests, API e2e, build, Playwright.

## Scripts

| Script                              | Description                  |
| ----------------------------------- | ---------------------------- |
| `pnpm db:up`                        | Postgres only                |
| `pnpm deploy:up`                    | Full stack (`--profile app`) |
| `pnpm lint` / `typecheck` / `build` | Quality gates                |

## Status

Beyond the original roadmap: **refresh tokens**, **learning goals**, **UI polish**, and **Docker deploy**.
