# 0003 — Module boundaries: public.ts, testing.ts, events

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

Modules must be developable and testable in isolation, including in a sparse checkout
where the other modules' code is absent.

## Decision

- Every backend module has:
  - `index.ts`: the default export from `defineModule({ name, dependsOn, register })`.
    The loader discovers it. There is no central list.
  - `public.ts`: types, and the service and event declarations (augmenting
    `ServiceMap`/`EventMap`). It may import only from `core` and `@pilates/contracts`.
  - `testing.ts`: in-memory fakes of the services it provides, for consumers' tests.
- Modules exchange **services** through the typed registry (`ctx.services`) and
  **domain events** through `ctx.events`. Dependencies form a DAG. "Upward" needs use
  ports or events.
- Each module owns its tables (`schema.ts`). No module reads or writes another
  module's tables.
- ESLint forbids deep imports into other modules and cross-feature imports in the
  frontends.

## Consequences

- A module's tests load only that module (`buildTestApp({ modules: ['booking'] })`).
- Fakes must be kept faithful to the real behaviour. Each provider module's own tests
  keep the real implementation honest. Contract tests can compare fake and real where
  that is worth it.
- In-process events are not durable. If a handler fails, it is logged. Critical flows
  are idempotent and have a reconciliation path (for example, the hold sweeper). If we
  ever split into services, events move to an outbox table.
