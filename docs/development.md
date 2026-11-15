# Development

## Prerequisites

- Node 22 (`.nvmrc`) and pnpm 10 (`corepack enable`)
- Docker, for local Postgres. Alternatively set `DATABASE_URL=pglite:memory` for a
  throwaway in-process database.
- [Stripe CLI](https://docs.stripe.com/stripe-cli), for payments in development

## First run

```bash
pnpm install
cp .env.example .env            # then fill in Stripe test keys
docker compose up -d postgres
pnpm dev                        # api :3000 · web :5173 · admin :5174
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
pnpm --filter @pilates/api db:generate
```

Commit the generated files in `apps/api/drizzle/`.

## Adding a module

1. Copy `requirements/_templates/*` to `requirements/<module>/`, and pick a unique
   prefix and the dependencies.
2. Create `apps/api/src/modules/<module>/{index,public,testing}.ts` and/or
   `apps/{web,admin}/src/features/<module>/routes.tsx`. They are discovered automatically.
3. Add `packages/contracts/src/<module>.ts` and export it from `index.ts`.
4. Run `node scripts/agent-workspace.mjs --check`.
