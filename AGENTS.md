# Agent guide

Instructions for AI agents (and humans) working in this repository. Read this first.

## What this is

A booking system for a Pilates studio:

- **Members** log in to the member app, see the available courses and their dates
  (appointments), book one, and pay right away with Stripe Checkout.
- **Admins** use the admin portal to manage courses, add dates, and see attendees.

The development process is **requirements-driven and test-driven**:
`requirements/` → tests that reference requirement IDs → code.

## Repository map

```
requirements/            source of truth. Read requirements/README.md
  _shared/               glossary, domain model, API conventions (always read)
  <module>/              module.json · spec.md · interface.md
apps/api/                Fastify + Drizzle (Postgres) backend
  src/core/              platform: config, errors, module loader, event bus, db
  src/modules/<module>/  index.ts · public.ts · testing.ts · __tests__/ · (schema.ts …)
  test/helpers.ts        buildTestApp(), FakeClock
apps/web/                member app (React + Vite). src/features/<module>/routes.tsx
apps/admin/              admin portal (React + Vite). src/features/<module>/routes.tsx
packages/contracts/      zod schemas for every HTTP request/response (contract first)
packages/web-kit/        shared frontend shell (API client, route types, error boundary)
e2e/tests/<module>/      Playwright journeys
scripts/                 req-trace.mjs (traceability) · agent-workspace.mjs (sparse checkout)
docs/                    architecture, ADRs, workflows
```

## Working on one module

1. `node scripts/agent-workspace.mjs <module> --context` lists the files to read, and
   nothing more. Use `--apply` to sparse-check out only that slice (see
   [docs/agent-workflow.md](docs/agent-workflow.md)).
2. Read `requirements/_shared/*`, your module's `spec.md` and `interface.md`, and the
   `interface.md` of each dependency. **Do not** read other modules' `spec.md` or code.
   Their `interface.md`, `public.ts` and `testing.ts` are the whole contract.
3. Pick an `Approved` requirement. Its `todo` tests already exist in `__tests__/`.
4. **Red:** turn a `todo` into a real, failing test. Keep the `[ID/ACn]` tag in its title.
5. **Green:** implement the smallest change that passes. **Refactor.**
6. When every AC of a requirement has a real test, set `Status: Implemented`.
7. Run `pnpm verify` (format, lint, typecheck, test, req:check). Everything must be green.

## Rules

- **Stay inside your module.** You may edit:
  - `requirements/<module>/`
  - every path listed in `requirements/<module>/module.json`, including your
    contract file in `packages/contracts/src/<module>.ts`.
    Editing `_shared/`, `core/`, another module, or a dependency's `interface.md` is a
    **cross-module change**. Describe it in your PR under "Cross-module changes needed"
    instead of making it.
- **Module boundaries in code:** a backend module imports other modules only via
  `../<other>/public.js` (types) and, in tests, `../<other>/testing.js` (fakes). ESLint
  enforces this. A frontend feature never imports another feature. It links by URL.
- **Talk across modules with services and events** from `public.ts` (see
  `requirements/platform/interface.md`). Never write another module's tables.
- **Contract first:** change the zod schema in `packages/contracts` before you change
  the endpoint or the page.
- **Time:** use `ctx.clock.now()`, never `new Date()`, in domain logic. Tests move a
  `FakeClock`.
- **Money:** integer cents plus currency. The price always comes from the server.
- **Stripe:** only `modules/payments/stripe-gateway.ts` may import `stripe`. Tests never
  reach the network.
- Never weaken, skip or delete a test to get green. If a requirement is wrong, change the
  requirement (with a reason in the PR) and then the test.
- Commit messages: `<module>: <what> (<IDs>)`, e.g. `booking: hold seat on booking (BOOK-001, BOOK-002)`.

## Commands

| Command                                      | What                                              |
| -------------------------------------------- | ------------------------------------------------- |
| `pnpm install`                               | Install the workspace                             |
| `podman-compose up -d`                       | Whole stack in containers: web :8080, admin :8081 |
| `pnpm dev`                                   | api :3000, web :5173, admin :5174                 |
| `pnpm test`                                  | Unit and integration tests (all packages)         |
| `pnpm --filter @pilates/api test -- booking` | Only the tests matching "booking"                 |
| `pnpm req:trace`                             | Requirement ↔ test matrix                         |
| `pnpm verify`                                | Everything CI runs, except e2e                    |
| `pnpm test:e2e`                              | Playwright (needs Postgres and Stripe test keys)  |
