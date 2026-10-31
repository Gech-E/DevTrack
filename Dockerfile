# syntax=docker/dockerfile:1

# Build order matters: @devtrack/shared must be compiled before the API or web app can build.

FROM node:22-alpine AS base
# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl \
  && corepack enable \
  && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/tsconfig/package.json packages/tsconfig/
RUN pnpm install --frozen-lockfile

FROM deps AS api-build
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @devtrack/shared build \
  && pnpm --filter @devtrack/api exec prisma generate \
  && pnpm --filter @devtrack/api build

# ---- API runtime -------------------------------------------------------------------------------
# No pnpm/corepack at runtime (it would try to download itself as the unprivileged user);
# binaries are invoked straight from node_modules/.bin.
FROM node:22-alpine AS api
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=api-build --chown=node:node /app /app
WORKDIR /app/apps/api
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health/live >/dev/null || exit 1
# Migrations run on boot (single-instance deployments). With several replicas, run
# `prisma migrate deploy` once as a release step instead and start only `node dist/main.js`.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]

# ---- Web build ---------------------------------------------------------------------------------
FROM deps AS web-build
# Baked into the client bundle at build time. Deliberately no default: the build fails without it.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CONTACT_EMAIL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @devtrack/shared build && pnpm --filter @devtrack/web build

# ---- Web runtime -------------------------------------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production
COPY --from=web-build --chown=node:node /app /app
WORKDIR /app/apps/web
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1
CMD ["./node_modules/.bin/next", "start", "--port", "3000"]
