# syntax=docker/dockerfile:1.7
# Build with: docker build -f apps/bot/Dockerfile -t hannario-bot .
# Context must be the monorepo root.

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN apk add --no-cache libc6-compat \
 && corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/bot/package.json ./apps/bot/
COPY packages/database/package.json ./packages/database/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app ./
COPY . .
# tsup bundles src/main.ts -> dist/main.js (ESM, externalizes deps,
# inlines @repo/* per tsup.config.ts noExternal).
RUN pnpm --filter @repo/bot run build
# Produce a pruned production tree at /prod/bot containing only what the
# bot's package.json "files": ["dist"] declares plus production deps.
# --legacy is required because pnpm v10 otherwise demands
# inject-workspace-packages=true workspace-wide.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @repo/bot --prod deploy --legacy /prod/bot

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
# node:22-alpine ships with a non-root `node` user (uid 1000).
COPY --from=builder --chown=node:node /prod/bot /app
USER node
CMD ["node", "dist/main.js"]
