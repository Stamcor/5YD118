# 0001 — TypeScript monorepo and stack

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

We need a member app, an admin portal and an API. Several agents will work in
parallel, so shared types must not drift between frontend and backend.

## Decision

- A single **pnpm workspace**: `apps/{api,web,admin}`, `packages/{contracts,web-kit}`
  and `e2e`.
- **TypeScript everywhere**, in strict mode. The HTTP contract is defined once as zod
  schemas in `@pilates/contracts`.
- **API:** Fastify 5 with Drizzle ORM on Postgres. Tests run on **PGlite** (Postgres
  compiled to WASM, in-process), so integration tests need neither Docker nor network.
- **Frontends:** React 19 and Vite, with React Router.
- **Tests:** Vitest for everything below e2e. Playwright for e2e.

## Consequences

- One `pnpm install`, one lockfile, and one CI pipeline.
- Frontend and backend types cannot drift silently. Responses are parsed against the
  same schemas the API validates with.
- PGlite is Postgres, not a mock, but it is single-connection. True concurrency tests
  need real Postgres (PLAT-012), which CI provides.
