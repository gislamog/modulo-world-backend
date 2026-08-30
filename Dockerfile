# Production image. Unlike Dockerfile.dev, which bind-mounts the source and
# runs Nest in watch mode, this compiles to dist/ and ships only what is
# needed to run it. Built for linux/arm64 in CI to match the Oracle Ampere
# server.

# ---- build ----
FROM node:24-alpine AS build

WORKDIR /app

# Manifests first, so this layer is cached until dependencies change.
COPY package.json package-lock.json ./
# The full dependency set: the build needs the Nest CLI and TypeScript,
# which are devDependencies.
RUN npm ci

# The Prisma client is generated, platform-specific code. Generating it
# inside the build means it matches the image architecture rather than
# whatever the developer's machine produced. It needs no database.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY . .

RUN npm run build

# Drop to production dependencies only. This deletes and reinstalls
# node_modules, so the generated Prisma client has to be restored after.
RUN npm prune --omit=dev && npx prisma generate

# ---- runtime ----
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

USER node

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
# Migrations ship with the image so a deploy can run 'prisma migrate
# deploy' against the production database without a checkout.
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

# The compiled entry point, not 'npm run start:prod'. npm would sit in
# the process tree as PID 1 and swallow the signals that stop the
# container cleanly.
CMD ["node", "dist/main"]
