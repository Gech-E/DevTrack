# DevTrack

Personal developer learning and task management application.

This repository is a **pnpm monorepo** with a Next.js frontend (`apps/web`) and a NestJS API (`apps/api`).

## Stack

- Next.js + TypeScript + Tailwind CSS + shadcn-style UI primitives
- NestJS + PostgreSQL + Prisma
- JWT authentication
- Jest (API unit + integration, web RTL)
- Playwright (browser e2e)
- Docker Compose (PostgreSQL)
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
├── docker-compose.yml
└── package.json
```

## Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable` then `corepack prepare pnpm@9.15.0 --activate`)
- Docker Desktop (for PostgreSQL)
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

`pnpm db:migrate` creates/applies Prisma migrations. On first run, when prompted for a migration name, use something like `init`.

## Start PostgreSQL

```bash
pnpm db:up
# or: docker compose up -d
```

Check health:

```bash
docker compose ps
```

Stop:

```bash
pnpm db:down
```

> From the host machine, use `localhost:55432` in `DATABASE_URL` (Compose maps host `55432` → container `5432` to avoid clashing with other local Postgres instances).  
> If an app later runs _inside_ Compose, use hostname `postgres` and port `5432` instead.

## Database commands

| Script            | Description                                    |
| ----------------- | ---------------------------------------------- |
| `pnpm db:migrate` | Create/apply migrations (`prisma migrate dev`) |
| `pnpm db:seed`    | Seed demo user, project, and tasks             |
| `pnpm db:studio`  | Open Prisma Studio                             |

**Seed credentials (local only):**

- Email: `demo@devtrack.local`
- Password: `password123`

## Start the API

```bash
pnpm dev:api
```

Health check: [http://localhost:3001/health](http://localhost:3001/health)  
Expect `database: "up"` when Postgres is reachable.

### Auth API (`/api/v1`)

| Method | Path                    | Auth       | Description                              |
| ------ | ----------------------- | ---------- | ---------------------------------------- |
| `POST` | `/api/v1/auth/register` | No         | Create account → `{ accessToken, user }` |
| `POST` | `/api/v1/auth/login`    | No         | Login → `{ accessToken, user }`          |
| `GET`  | `/api/v1/auth/me`       | Bearer JWT | Current user profile                     |

### Projects API — all require Bearer JWT

| Method   | Path                   | Description                  |
| -------- | ---------------------- | ---------------------------- |
| `GET`    | `/api/v1/projects`     | List current user's projects |
| `GET`    | `/api/v1/projects/:id` | Get one owned project        |
| `POST`   | `/api/v1/projects`     | Create project               |
| `PATCH`  | `/api/v1/projects/:id` | Update owned project         |
| `DELETE` | `/api/v1/projects/:id` | Delete owned project (`204`) |

### Tasks API — all require Bearer JWT

| Method   | Path                                        | Description         |
| -------- | ------------------------------------------- | ------------------- |
| `GET`    | `/api/v1/projects/:projectId/tasks`         | List tasks          |
| `GET`    | `/api/v1/projects/:projectId/tasks/:taskId` | Get one task        |
| `POST`   | `/api/v1/projects/:projectId/tasks`         | Create task         |
| `PATCH`  | `/api/v1/projects/:projectId/tasks/:taskId` | Update task         |
| `DELETE` | `/api/v1/projects/:projectId/tasks/:taskId` | Delete task (`204`) |

`status`: `TODO` \| `IN_PROGRESS` \| `DONE`  
`priority`: `LOW` \| `MEDIUM` \| `HIGH`

## Start the frontend

```bash
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000)

- `/login` — sign in (seed: `demo@devtrack.local` / `password123`)
- `/register` — create account
- `/projects` — list/create/delete projects
- `/projects/:id` — manage tasks

## Tests

```bash
# Unit tests (API services + web LoginForm)
pnpm test

# API integration (needs Postgres up + migrated/seeded)
pnpm test:e2e:api

# Browser e2e (starts API + web if not already running)
pnpm exec playwright install chromium   # once
pnpm test:e2e
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) on `push`/`pull_request` to `main`:

1. Start Postgres service
2. Install, migrate, seed
3. Lint, typecheck, unit tests
4. API e2e
5. Build apps
6. Playwright Chromium e2e

## Other scripts

| Script           | Description              |
| ---------------- | ------------------------ |
| `pnpm lint`      | Lint workspace packages  |
| `pnpm format`    | Format with Prettier     |
| `pnpm typecheck` | TypeScript checks        |
| `pnpm build`     | Build shared + api + web |

## Current phase

**Phases 1–8 complete** — monorepo, database, JWT auth, projects/tasks APIs, web UI, automated tests, and CI.
