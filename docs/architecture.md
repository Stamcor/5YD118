# Architecture

## Overview

```mermaid
flowchart LR
  subgraph Browser
    W["Member app<br/>apps/web"]
    A["Admin portal<br/>apps/admin"]
  end
  subgraph API["apps/api (Fastify, modular monolith)"]
    C[core: config · errors · loader · events · db]
    AU[auth] --- CO[courses] --- SC[scheduling] --- BO[booking] --- PA[payments]
  end
  DB[(Postgres)]
  S[Stripe]
  W -- "/api (cookie session)" --> API
  A -- "/api/admin" --> API
  API --> DB
  PA -- "Checkout Session, Refund" --> S
  S -- "webhook /api/payments/webhook" --> PA
  W -. "redirect to Checkout" .-> S
```

- **Modular monolith.** One deployable API process. It is split into modules with
  explicit dependencies, which is cheap to run and easy to split later. Modules are the
  unit of ownership, of requirements, and of agent work.
- **Two frontends.** The member app and the admin portal are deployed separately, which
  keeps the admin surface small and makes it easy to restrict by network if needed.
  Both are SPAs that talk to the same API with cookie sessions.
- **Contracts package.** The zod schemas in `packages/contracts` are the single
  definition of the HTTP API. The API uses them to validate requests, and the
  frontends use them to parse responses.

## Module dependencies

```mermaid
flowchart BT
  auth --> platform
  courses --> auth
  scheduling --> courses
  booking --> scheduling
  booking --> payments
  payments --> platform
```

Every module depends on `platform`, the core. When a module needs to talk "upwards",
it does not import. It uses:

- **Ports:** the lower module declares an interface, and the upper module implements
  it. Example: scheduling needs seat counts and declares `scheduling.occupancy`.
  Booking provides it.
- **Domain events:** example: payments publishes `payment.succeeded`, and booking
  subscribes.

## The book-and-pay flow

```mermaid
sequenceDiagram
  autonumber
  actor M as Member
  participant W as Web app
  participant B as booking
  participant P as payments
  participant S as Stripe
  M->>W: choose appointment, "Book & pay"
  W->>B: POST /api/bookings {appointmentId}
  B->>B: tx: advisory lock, check seats, insert pending_payment (hold 30 min)
  B->>P: checkout.create(bookingId, price snapshot, expiresAt)
  P->>S: create Checkout Session (idempotency key checkout-<bookingId>)
  S-->>P: session url
  P-->>B: {checkoutUrl}
  B-->>W: 201 {booking, checkoutUrl}
  W->>S: redirect to Checkout
  M->>S: pays
  S->>P: webhook checkout.session.completed (signed)
  P->>P: verify signature, dedupe event, payment → paid
  P-->>B: event payment.succeeded
  B->>B: booking → confirmed
  S->>W: redirect /bookings/:id/return
  W->>B: poll GET /api/bookings/:id until confirmed
```

Key properties:

- **Capacity safety:** a transaction-scoped advisory lock per appointment makes the seat
  check and the insert atomic (BOOK-002).
- **Holds instead of overbooking:** a pending booking holds a seat for
  `BOOKING_HOLD_MINUTES` (≥ 30, the Stripe Checkout minimum). Expiry is enforced in
  three ways: in the seat count query, by a sweeper, and by the
  `checkout.session.expired` webhook.
- **The webhook is the source of truth.** The success redirect never confirms a
  booking (BOOK-006).
- **Idempotency everywhere:** Stripe idempotency keys, stored event ids, and monotonic
  state transitions (PAY-003).

## Tech stack

| Concern  | Choice                                                            | ADR  |
| -------- | ----------------------------------------------------------------- | ---- |
| Language | TypeScript (strict), Node 22                                      | 0001 |
| Monorepo | pnpm workspaces                                                   | 0001 |
| API      | Fastify 5, zod 4                                                  | 0001 |
| Database | Postgres 17, Drizzle ORM, drizzle-kit migrations. PGlite in tests | 0001 |
| Frontend | React 19, Vite, React Router                                      | 0001 |
| Tests    | Vitest (unit/integration), Testing Library, Playwright (e2e)      | 0001 |
| Payments | Stripe Checkout (hosted) and webhooks                             | 0004 |
| Auth     | Server-side sessions in an httpOnly cookie, argon2id              | 0005 |
