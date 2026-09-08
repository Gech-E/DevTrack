# DevTrack

Personal developer learning and task management application.

This repository is a **pnpm monorepo** with a Next.js frontend (`apps/web`) and a NestJS API (`apps/api`). Phase 1 sets up the development environment only — no authentication or business features yet.

## Stack

- Next.js + TypeScript + Tailwind CSS (+ shadcn/ui later)
- NestJS + PostgreSQL + Prisma (Prisma in a later phase)
- JWT auth (later)
- Jest, React Testing Library, Playwright (later)
- Docker Compose (PostgreSQL)
- pnpm workspaces

## Repository structure

```text
DevTrack/
├── apps/
│   ├── web/          # Next.js UI
│   └── api/          # NestJS API
├── packages/
│   ├── shared/       # Shared types/constants (framework-free)
│   ├── eslint-config/
│   └── tsconfig/
├── docker-compose.yml
└── package.json
```

## Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable` then `corepack prepare pnpm@9.15.0 --activate`)
- Docker Desktop (for PostgreSQL)

## Setup

```bash
# From repo root
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

pnpm install
pnpm db:up
```

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

## Start the API

```bash
pnpm dev:api
```

Health check: [http://localhost:3001/health](http://localhost:3001/health)

## Start the frontend

```bash
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000)

## Other scripts

| Script           | Description                                      |
| ---------------- | ------------------------------------------------ |
| `pnpm lint`      | Lint all packages/apps that define a lint script |
| `pnpm format`    | Format with Prettier                             |
| `pnpm typecheck` | TypeScript checks across the workspace           |

## Current phase

**Phase 1 — repository and development environment.**  
Do not expect auth, projects, tasks, or Prisma migrations yet.
