# Member app or admin portal (PLAT-013), served by nginx, which proxies /api to the API.
#   podman build -f infra/containers/frontend.Containerfile --build-arg APP=web   -t localhost/pilates/web .
#   podman build -f infra/containers/frontend.Containerfile --build-arg APP=admin -t localhost/pilates/admin .
ARG APP=web

FROM docker.io/library/node:22-alpine AS build
ARG APP
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY packages/contracts/package.json packages/contracts/
COPY packages/web-kit/package.json packages/web-kit/
COPY e2e/package.json e2e/
RUN pnpm install --frozen-lockfile --filter "@pilates/${APP}..."
COPY packages packages
COPY apps/${APP} apps/${APP}
RUN pnpm --filter "@pilates/${APP}" build

FROM docker.io/library/nginx:1.31.2-alpine
ARG APP
# The nginx entrypoint renders templates with envsubst (only defined variables).
ENV API_UPSTREAM=http://api:3000
COPY infra/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/${APP}/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
