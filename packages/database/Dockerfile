# syntax=docker/dockerfile:1.7
# Build with: docker build -f packages/database/Dockerfile -t hannario-migrate .
# Context must be the monorepo root.
#
# This is a one-shot image. Run it as:
#   docker run --rm -e DATABASE_URL=... hannario-migrate
# It exits 0 on success, non-zero if any migration fails.

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
# Filter to only install @repo/database and its (dev+prod) deps. This excludes
# the large web/bot trees (Next.js, MUI, discord.js etc.) from the image.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@repo/database..."

FROM base AS runner
ENV NODE_ENV=production
# drizzle-kit is a devDependency in package.json but at this image's runtime
# we need it, so we keep the full install from deps stage (not --prod).
COPY --from=deps --chown=node:node /app /app
# Source needed at runtime: drizzle.config.ts, src/ (config + schema), drizzle/ (SQL).
COPY --chown=node:node packages/database/drizzle.config.ts ./packages/database/drizzle.config.ts
COPY --chown=node:node packages/database/src ./packages/database/src
COPY --chown=node:node packages/database/drizzle ./packages/database/drizzle
WORKDIR /app/packages/database
USER node
CMD ["pnpm", "migrate"]
