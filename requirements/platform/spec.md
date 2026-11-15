# Platform — requirements

Cross-cutting foundations every other module builds on. The code lives in
`apps/api/src/core`, `apps/api/test`, `apps/{web,admin}/src/{app,lib}` and
`packages/contracts/src/common.ts`.

### PLAT-001 — Health endpoint

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Story:** As an operator I want a health endpoint so that load balancers and
uptime checks can tell whether the API is running.

**Acceptance criteria**

1. **Given** the API is running, **when** `GET /api/health` is called, **then** it responds
   `200` with `{ "status": "ok" }`.
2. The endpoint needs no authentication.

### PLAT-002 — Configuration is validated at startup

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Story:** As an operator I want misconfiguration to fail fast so that a broken
deployment never serves traffic.

**Acceptance criteria**

1. **Given** all required variables from `.env.example` are valid, **when** the config is
   loaded, **then** a typed config object is returned with defaults applied
   (`PORT=3000`, `BOOKING_HOLD_MINUTES=30`, `BOOKING_CUTOFF_MINUTES=60`,
   `CANCELLATION_DEADLINE_HOURS=24`).
2. **Given** a required variable is missing or invalid, **when** the config is loaded,
   **then** loading fails with an error that names **every** invalid key and contains no
   secret values.
3. **Given** `BOOKING_HOLD_MINUTES` is below 30, **then** loading fails. Stripe Checkout
   sessions cannot expire sooner.
4. **Given** `NODE_ENV=production` and a Stripe key that starts with `sk_test_`, **then**
   loading fails.

### PLAT-003 — Uniform error responses

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api, contracts

**Story:** As a frontend developer I want every error in the same shape so that I can
handle them in one place.

**Acceptance criteria**

1. **Given** a handler throws `AppError(code, status)`, **then** the response has that
   status and body `{ error: { code, message } }`. The body matches `ErrorResponseSchema`.
2. **Given** a request body fails its zod schema, **then** the response is `400`
   `VALIDATION_ERROR` with `details.issues` listing each failing path.
3. **Given** an unexpected exception, **then** the response is `500` `INTERNAL` with a
   generic message, and no stack trace or internal message leaks.
4. **Given** an unknown route, **then** the response is `404` `NOT_FOUND` in the same shape.

### PLAT-004 — Structured, privacy-safe logging

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Acceptance criteria**

1. Every request log line is JSON and includes a request id, method, route, status and
   duration. The request id is returned in the `x-request-id` response header.
2. Passwords, session ids, cookies, `authorization` headers and Stripe secrets are
   redacted from logs.

### PLAT-005 — Browser security: CORS, CSRF and headers

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Acceptance criteria**

1. CORS allows only `WEB_ORIGIN` and `ADMIN_ORIGIN`, with credentials.
2. **Given** a `POST`/`PUT`/`PATCH`/`DELETE` request whose `Origin` is missing or not
   allowed, **then** it is rejected with `403` `CSRF_REJECTED`. The exception is
   `/api/payments/webhook`.
3. Responses carry `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin` and a restrictive `Content-Security-Policy` for
   the API.

### PLAT-006 — Versioned database migrations

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Acceptance criteria**

1. Each module owns its tables in `apps/api/src/modules/<module>/schema.ts`. Migrations
   are generated with drizzle-kit into `apps/api/drizzle/` and committed.
2. `buildTestApp()` applies all migrations to a fresh PGlite database.
3. `pnpm db:drift` regenerates the migrations and fails if `schema.ts` and the committed
   migrations differ. CI runs it.
4. The API applies pending migrations at startup, before it listens
   (`DB_MIGRATE_ON_START`, default `true`). `podman-compose up` therefore gives a ready
   database. With no migrations yet, start-up succeeds and does nothing.

### PLAT-007 — Module loader and domain event bus

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Story:** As a module developer I want modules to be discovered and wired
automatically so that I can develop and test my module without the others being
present.

**Acceptance criteria**

1. **Given** a directory `apps/api/src/modules/<name>/` with an `index.ts` that
   default-exports a module definition, **then** the app registers it at start-up. No
   central list is edited.
2. Modules are registered in dependency order (`dependsOn`). A missing dependency fails
   start-up with an error naming the module and the missing dependency. Tests that load
   only some modules (`buildTestApp({ modules: [...] })`) opt out and supply the
   dependencies' services as fakes.
3. Modules exchange services through a typed service registry
   (`ctx.services.provide`/`require`) and domain events through `ctx.events`.
   `require` of an unknown service throws an error that names the service.
4. All subscribed handlers of an event are invoked. A failing handler is logged and does
   not fail the publisher or the other handlers. Publishers publish only after their
   transaction has committed.

### PLAT-012 — Integration tests against real Postgres

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Acceptance criteria**

1. **Given** `TEST_DATABASE_URL` is set, `buildTestApp({ db: 'postgres' })` runs against
   that server in an isolated, freshly migrated schema, which is dropped afterwards.
2. Tests that need real concurrency (for example BOOK-002) use `describe.runIf(hasPostgres)`.
   CI provides a Postgres service, so they always run there.

### PLAT-013 — Whole stack starts with `podman-compose up`

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Story:** As a developer or operator I want to start the whole system with one command
so that I can run it locally or on a single host without installing Node or Postgres.

**Acceptance criteria**

1. **Given** a checkout with no `.env`, **when** `podman-compose up -d` is run in the
   repository root, **then** the services `postgres`, `api`, `web` and `admin` start.
   `docker compose up -d` gives the same result.
2. The member app is served on <http://localhost:8080> and the admin portal on
   <http://localhost:8081>. Each proxies `/api` to the API on the same origin, so cookies
   and the CSRF origin check work without CORS.
3. Images are rootless-friendly. Image names are fully qualified (`docker.io/…`), the
   API runs as a non-root user, and the API image contains only production
   dependencies.
4. Every setting has a working development default and can be overridden from `.env`
   (Stripe keys, secrets, ports).
5. `podman-compose --profile stripe up` additionally starts the Stripe CLI, which
   forwards webhooks to `api:3000/api/payments/webhook`.
6. `scripts/compose-smoke.sh` brings the stack up, checks `GET /api/health` through both
   frontends, and tears it down. CI runs it on every pull request.

### PLAT-008 — Public client configuration

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api, contracts

**Acceptance criteria**

1. `GET /api/config/public` returns `{ studioTimezone, currency, bookingHoldMinutes,
cancellationDeadlineHours }` without authentication, and nothing secret.

### PLAT-009 — Frontend app shells

- **Priority:** Must
- **Status:** Approved
- **Layers:** web, admin

**Acceptance criteria**

1. The member app (`apps/web`) and the admin portal (`apps/admin`) discover routes from
   `src/features/*/routes.tsx`. Adding a feature needs no edit to the shell.
2. Routes marked `requiresAuth` redirect unauthenticated users to `/login?next=<path>`.
   In the admin portal, every route except `/login` requires role `admin`.
3. A top-level error boundary shows a friendly message and a retry action instead of a
   blank page.
4. API errors are parsed with `ErrorResponseSchema`. A `401` from any call sends the user
   to the login page.

### PLAT-010 — Accessibility

- **Priority:** Should
- **Status:** Approved
- **Layers:** web, e2e

**Acceptance criteria**

1. Member flows (login, course list, booking) have no `serious` or `critical` axe
   violations (WCAG 2.2 AA).
2. Everything in those flows works with the keyboard alone.

### PLAT-011 — Continuous integration

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Acceptance criteria**

1. Every pull request runs format check, lint, typecheck, unit/integration tests and
   `req:check`. A failure blocks the merge.
2. End-to-end tests run in CI against a real Postgres once `E2E_ENABLED` is set.
