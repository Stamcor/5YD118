# API image (PLAT-013). Build context: repository root.
#   podman build -f infra/containers/api.Containerfile -t localhost/pilates/api .
FROM docker.io/library/node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
# Manifests first, for layer caching. All workspace manifests keep the lockfile consistent.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY packages/contracts/package.json packages/contracts/
COPY packages/web-kit/package.json packages/web-kit/
COPY e2e/package.json e2e/
RUN pnpm install --frozen-lockfile --filter "@pilates/api..."
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter "@pilates/api..." build \
 && pnpm --filter @pilates/api deploy --prod --legacy /out

FROM docker.io/library/node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/main.js"]
