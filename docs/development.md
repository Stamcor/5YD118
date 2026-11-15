# Development

## Prerequisites

- Node 22 (`.nvmrc`) and pnpm 10 (`corepack enable`)
- Podman with podman-compose (or Docker with Compose), for Postgres or the whole stack.
  Alternatively, set `DATABASE_URL=pglite:memory` for a throwaway in-process database.
- [Stripe CLI](https://docs.stripe.com/stripe-cli), for payments in development

## First run

```bash
pnpm install
cp .env.example .env            # then fill in Stripe test keys
podman-compose up -d postgres   # or: docker compose up -d postgres
pnpm dev                        # api :3000 · web :5173 · admin :5174
```

## Whole stack in containers (PLAT-013)

```bash
podman-compose up -d --build        # web :8080 · admin :8081 · api :3000 · postgres :5432
podman-compose logs -f api
podman-compose down                 # add -v to also delete the database volume
scripts/compose-smoke.sh            # build, start, check, tear down (what CI runs)
```

- The images are defined in `infra/containers/`. `api.Containerfile` is a multi-stage
  build that ends in a non-root Node image with production dependencies only.
  `frontend.Containerfile` (`--build-arg APP=web|admin`) ends in nginx, which serves the
  SPA and proxies `/api` to `api:3000`. The browser therefore talks to a single origin.
- All image names are fully qualified (`docker.io/...`), so rootless podman needs no
  short-name configuration.
- Settings come from `.env` with defaults in `compose.yaml`. The stack uses
  `PUBLIC_WEB_ORIGIN`/`PUBLIC_ADMIN_ORIGIN` instead of `WEB_ORIGIN`/`ADMIN_ORIGIN`, so
  one `.env` serves both `pnpm dev` and the containers.
- Stripe webhooks: put test keys in `.env`, then run `podman-compose --profile stripe up -d`.
  `podman-compose logs stripe` prints the `whsec_...` secret. Set it as
  `STRIPE_WEBHOOK_SECRET` and run `podman-compose up -d api` to apply it.
- The API applies database migrations when it starts (PLAT-006).
- Create the first admin inside the running stack. The password is prompted for, or
  read from stdin:

  ```bash
  podman-compose exec api node dist/modules/auth/cli/create-admin.js --email admin@studio.test --name "Studio Admin"
  ```

Payments in development (in a second terminal):

```bash
stripe login
stripe listen --forward-to localhost:3000/api/payments/webhook
# copy the printed whsec_… into STRIPE_WEBHOOK_SECRET in .env
```

Pay with the test card `4242 4242 4242 4242`, any future date and any CVC. Use
`4000 0000 0000 9995` to see a declined payment.

Create an admin (AUTH-006):

```bash
pnpm --filter @pilates/api admin:create --email admin@studio.test --name "Studio Admin"
```

## Test-driven loop

```bash
pnpm --filter @pilates/api test:watch -- booking   # watch one module's tests
pnpm req:trace                                     # see what is planned / tested
```

1. Find the `it.todo('[BOOK-002/AC1] …')`.
2. Replace it with a real test (`it('[BOOK-002/AC1] …', async () => { … })`) and watch
   it **fail**.
3. Implement it until it passes, then refactor.
4. When every AC of the requirement is covered, set `Status: Implemented` in the spec.
   `pnpm req:check` enforces that the status is honest.

### Test levels

| Level           | Where                                          | Runs on                                  |
| --------------- | ---------------------------------------------- | ---------------------------------------- |
| Contract        | `packages/contracts/src/*.test.ts`             | Vitest                                   |
| API integration | `apps/api/src/modules/<m>/__tests__/`          | Vitest + `app.inject` + PGlite           |
| Concurrency     | same, `describe.runIf(hasPostgres)`            | real Postgres (CI)                       |
| Frontend        | `apps/{web,admin}/src/features/<m>/__tests__/` | Vitest + Testing Library + jsdom         |
| End-to-end      | `e2e/tests/<m>/`                               | Playwright, full stack, Stripe test mode |

Mostly test through the HTTP API (`app.inject`). It exercises routing, validation,
the database and the error format together, without the network.

## Database migrations (PLAT-006)

```bash
# after changing apps/api/src/modules/<m>/schema.ts
pnpm --filter @pilates/api db:generate   # writes apps/api/drizzle/NNNN_*.sql
pnpm db:drift                            # CI: fails if schema.ts and migrations disagree
```

- Commit the generated files in `apps/api/drizzle/`, and never edit them by hand. Prettier
  ignores them.
- Each module prefixes its tables with its name (`auth_users`, `booking_bookings`, …).
- Migrations run on API start-up (`DB_MIGRATE_ON_START`, default `true`) and in every
  `buildTestApp()`.
- Two branches that both add a migration conflict in `meta/_journal.json`. Rebase,
  delete your new migration, and run `db:generate` again.
- Run `db:drift` in a **full** checkout only. In a sparse checkout, the other modules'
  `schema.ts` files are missing, so drizzle-kit would see them as dropped.

## Real Postgres in tests (PLAT-012)

```bash
podman run -d --name pg-test -e POSTGRES_USER=pilates -e POSTGRES_PASSWORD=pilates \
  -e POSTGRES_DB=pilates_test -p 55432:5432 docker.io/library/postgres:17-alpine
TEST_DATABASE_URL=postgres://pilates:pilates@localhost:55432/pilates_test pnpm test
```

Tests written with `it.runIf(hasPostgres)` / `buildTestApp({ db: 'postgres' })` run only
when it is set. CI always sets it.

## Adding a module

1. Copy `requirements/_templates/*` to `requirements/<module>/`, and pick a unique
   prefix and the dependencies.
2. Create `apps/api/src/modules/<module>/{index,public,testing}.ts` and/or
   `apps/{web,admin}/src/features/<module>/routes.tsx`. They are discovered automatically.
3. Add `packages/contracts/src/<module>.ts` and export it from `index.ts`.
4. Run `node scripts/agent-workspace.mjs --check`.
