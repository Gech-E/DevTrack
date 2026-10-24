# Railway uses the multi-stage Dockerfile; build the API target.
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
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

FROM node:20-alpine AS api
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=api-build /app /app
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]

FROM deps AS web-build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @devtrack/shared build && pnpm --filter @devtrack/web build

FROM node:20-alpine AS web
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=web-build /app /app
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
