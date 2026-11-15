# Payments — requirements

Collects money with **Stripe Checkout** and returns it with **Stripe Refunds**. Payments
knows bookings only as an opaque `bookingId` with an amount. It never reads seats or
appointments. See `docs/adr/0004-stripe-checkout.md`.

### PAY-001 — Create a checkout for a booking

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. `payments.checkout.create({ bookingId, amountCents, currency, description,
customerEmail, expiresAt })` creates a Stripe Checkout Session with `mode=payment`,
   one line item (`description`, amount, quantity 1), `client_reference_id=bookingId`,
   `metadata.bookingId`, `customer_email`, `expires_at=expiresAt`,
   `success_url=WEB_ORIGIN/bookings/{bookingId}/return?session_id={CHECKOUT_SESSION_ID}`
   and `cancel_url=WEB_ORIGIN/bookings/{bookingId}/return?cancelled=1`.
2. The Stripe request uses the idempotency key `checkout-<bookingId>`.
3. A `Payment` row with status `open` is stored, and `{ paymentId, checkoutUrl }` is
   returned.
4. **Given** an `open` payment already exists for the booking, **then** its checkout is
   returned and no new session is created (resume, BOOK-003).
5. **Given** Stripe errors, **then** an `AppError('PAYMENT_PROVIDER_ERROR', 502)` is
   thrown and no `Payment` row is left behind.

### PAY-002 — Webhook endpoint with signature verification

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. `POST /api/payments/webhook` verifies the `stripe-signature` header against the
   **raw** request body with `STRIPE_WEBHOOK_SECRET`.
2. **Given** a missing or invalid signature, **then** `400`, and nothing is processed.
3. The route needs no session and is exempt from the CSRF origin check.
4. Unknown event types are acknowledged with `200` and ignored.

### PAY-003 — Idempotent event processing

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. Every processed Stripe event id is stored. **Given** the same event is delivered again,
   **then** it is answered `200`, and nothing happens a second time (no duplicate
   domain events).
2. Processing and storing the event id happen in one transaction. A failure answers
   `500`, so Stripe retries.
3. State changes are monotonic. For example, a late `checkout.session.expired` after
   `paid` is ignored.

### PAY-004 — Successful payment

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. **Given** `checkout.session.completed` with `payment_status=paid`, or
   `checkout.session.async_payment_succeeded`, **then** the payment becomes `paid`,
   `stripePaymentIntentId` is stored, and `payment.succeeded { bookingId, paymentId }`
   is published.
2. **Given** `checkout.session.completed` with `payment_status=unpaid` (delayed payment
   methods), **then** nothing is published yet.
3. **Given** the amount or currency in the session differs from the stored payment,
   **then** nothing is published and an error is logged for manual review.

### PAY-005 — Expired and failed payments

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. **Given** `checkout.session.expired`, **then** the payment becomes `expired`, and
   `payment.expired { bookingId }` is published.
2. **Given** `checkout.session.async_payment_failed`, **then** the payment becomes
   `failed`, and `payment.failed { bookingId }` is published.
3. `payments.checkout.expire(bookingId)` expires an open Stripe session on request
   (BOOK-008/AC3). A session that is already complete or expired is not an error.

### PAY-006 — Refunds

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. `payments.refunds.refundForBooking(bookingId)` creates a full Stripe refund for the
   paid payment, with the idempotency key `refund-<bookingId>`, and sets `refundStatus`
   to `pending`.
2. **Given** the `refund.updated` / `charge.refunded` webhooks, **then** `refundStatus`
   becomes `refunded` or `failed`, and `payment.refunded { bookingId }` is published on
   success.
3. Calling it for a booking without a paid payment is a no-op. Calling it twice creates
   a single refund.

### PAY-007 — All Stripe access behind a gateway port

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. Only `modules/payments/stripe-gateway.ts` imports the `stripe` SDK. Everything else
   uses the `PaymentGateway` interface (`gateway.ts`).
2. `FakePaymentGateway` (internal, in `modules/payments/__tests__/fake-gateway.ts`)
   records calls, can be told to fail, and builds signed webhook payloads, so tests
   never reach the network.
3. A contract test checks the real `StripeGateway` against `stripe-mock` when
   `STRIPE_MOCK_URL` is set. Otherwise it is skipped.

### PAY-008 — Payment status for other modules

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. `payments.status.forBookings(ids)` returns `Map<bookingId, { status, refundStatus }>`
   for the admin attendee list (BOOK-011).

### PAY-009 — Embedded Checkout

- **Priority:** Could
- **Status:** Draft
- **Layers:** api, web

**Notes:** Use `ui_mode=embedded` to keep members on our domain. It needs a publishable
key in `/api/config/public` and Stripe.js in the web app.
