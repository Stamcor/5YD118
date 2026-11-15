# API conventions

These apply to every HTTP endpoint. They are implemented once in `platform`
(`apps/api/src/core`) and typed in `packages/contracts/src/common.ts`.

## Shape

- Base path `/api`. Member endpoints: `/api/<resource>`. Admin endpoints:
  `/api/admin/<resource>`. Stripe webhook: `/api/payments/webhook`.
- JSON in and out, `camelCase` fields. Request and response bodies are defined as **zod
  schemas in `@pilates/contracts`**. The API validates requests with them, and the
  frontends parse responses with them. Contract first: change the schema, then the code.
- Lists return `{ "items": [...] }`. Pagination, where needed, is
  `?limit=&cursor=` → `{ items, nextCursor }`.

## Errors

Every non-2xx response has this body:

```json
{ "error": { "code": "APPOINTMENT_FULL", "message": "Human readable text", "details": {} } }
```

| HTTP | `code`                     | When                                                                 |
| ---- | -------------------------- | -------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`         | Body/query/params fail the schema. `details.issues` lists the fields |
| 401  | `UNAUTHENTICATED`          | No valid session cookie                                              |
| 401  | `INVALID_CREDENTIALS`      | Login failed (same answer for unknown email and wrong password)      |
| 403  | `FORBIDDEN`                | Authenticated but the role is not allowed                            |
| 403  | `CSRF_REJECTED`            | State-changing request from an origin that is not allowed            |
| 404  | `NOT_FOUND`                | Resource does not exist **or is not visible to the caller**          |
| 409  | `EMAIL_TAKEN`              | Registration with an existing email                                  |
| 409  | `APPOINTMENT_FULL`         | No seats left                                                        |
| 409  | `ALREADY_BOOKED`           | Member already has a confirmed booking for the appointment           |
| 409  | `CANCELLATION_CLOSED`      | Past the cancellation deadline                                       |
| 409  | `INVALID_STATE`            | The transition is not allowed from the current state                 |
| 409  | `CAPACITY_BELOW_BOOKED`    | Admin lowers capacity below the seats already taken                  |
| 422  | `APPOINTMENT_NOT_BOOKABLE` | Appointment cancelled, started, past the cutoff, or course archived  |
| 422  | `COURSE_NOT_SCHEDULABLE`   | Appointment for an archived or unknown course                        |
| 429  | `RATE_LIMITED`             | Too many requests                                                    |
| 500  | `INTERNAL`                 | Unexpected. The message is generic and has no stack trace            |
| 502  | `PAYMENT_PROVIDER_ERROR`   | Stripe call failed                                                   |

Modules may add codes. They add them to their `interface.md` and to the
`ErrorCode` enum in `@pilates/contracts`.

## Authentication

- Login sets an `httpOnly`, `Secure` (except in development), `SameSite=Lax` cookie
  `sid` holding an opaque session id. There are no JWTs in the browser.
- `GET /api/auth/me` returns the current user or 401.
- Admin endpoints require role `admin` (401 if no session, 403 if member).
- **CSRF:** every non-GET request must carry an `Origin` header equal to `WEB_ORIGIN` or
  `ADMIN_ORIGIN`. The Stripe webhook is the only exception and is authenticated by its
  signature instead.

## Time and money

- Timestamps on the wire are ISO-8601 UTC strings (`2026-11-15T09:00:00.000Z`).
  Frontends render them in `STUDIO_TIMEZONE`. The API exposes it at
  `GET /api/config/public`.
- Money is `{ "amountCents": 2500, "currency": "eur" }`. Prices always come from the server.
  The client never sends a price.

## Testing conventions

- API tests use `buildTestApp()` from `apps/api/test/helpers.ts`. It gives you an
  in-process PGlite database and a controllable clock. They make no network calls,
  Stripe included.
- Every module that provides services ships `public.ts` (types, service keys, events)
  **and** `testing.ts` (in-memory fakes of those services for consumers). Test against a
  dependency through its fakes, not its real implementation.
- Time-dependent rules (holds, cutoffs, deadlines) are tested by moving the fake clock,
  never with `sleep`.
