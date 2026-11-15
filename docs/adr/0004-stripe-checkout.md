# 0004 — Stripe Checkout with webhook confirmation

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

Members must pay immediately after booking. We want minimal PCI scope, support for
local payment methods (cards, SEPA, Apple Pay, Google Pay …), and no overbooking.

## Decision

- Use **Stripe Checkout (hosted)**, with one Checkout Session per booking and
  `mode=payment`. Embedded Checkout is a later option (PAY-009).
- A booking **holds a seat** while it is `pending_payment`. The Checkout Session's
  `expires_at` equals the hold expiry. The minimum hold is 30 minutes, because that is
  Stripe's minimum session lifetime.
- Bookings are confirmed **only** by verified webhooks (`checkout.session.completed`
  with `payment_status=paid`, and `checkout.session.async_payment_succeeded`).
- We use idempotency keys (`checkout-<bookingId>`, `refund-<bookingId>`), store
  processed event ids, and apply only monotonic state transitions.
- All SDK use goes through the `PaymentGateway` port in `modules/payments`.

## Consequences

- SAQ-A PCI scope: card data never touches our servers.
- A member who pays after their hold expired is confirmed if a seat is still free.
  Otherwise they are refunded automatically (BOOK-006/AC2).
- Local development needs the Stripe CLI to forward webhooks (see `docs/development.md`).
