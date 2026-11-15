// Requirements: requirements/payments/spec.md
// TDD: pick a todo, turn it into a failing test, make it pass, repeat. When every AC of a
// requirement has a real test, set its Status to Implemented (checked by `pnpm req:check`).
import { describe, it } from 'vitest';

describe('PAY-001 — Create a checkout for a booking', () => {
  it.todo(
    '[PAY-001/AC1] payments.checkout.create({ bookingId, amountCents, currency, description, customerEmail, expiresAt }) creates a Stripe Checkout Session with …',
  );
  it.todo('[PAY-001/AC2] The Stripe request uses the idempotency key checkout-<bookingId>.');
  it.todo(
    '[PAY-001/AC3] A Payment row with status open is stored, and { paymentId, checkoutUrl } is returned.',
  );
  it.todo(
    '[PAY-001/AC4] Given an open payment already exists for the booking, then its checkout is returned and no new session is created (resume, BOOK-003).',
  );
  it.todo(
    "[PAY-001/AC5] Given Stripe errors, then an AppError('PAYMENT_PROVIDER_ERROR', 502) is thrown and no Payment row is left behind.",
  );
});

describe('PAY-002 — Webhook endpoint with signature verification', () => {
  it.todo(
    '[PAY-002/AC1] POST /api/payments/webhook verifies the stripe-signature header against the raw request body with STRIPE_WEBHOOK_SECRET.',
  );
  it.todo(
    '[PAY-002/AC2] Given a missing or invalid signature, then 400, and nothing is processed.',
  );
  it.todo('[PAY-002/AC3] The route needs no session and is exempt from the CSRF origin check.');
  it.todo('[PAY-002/AC4] Unknown event types are acknowledged with 200 and ignored.');
});

describe('PAY-003 — Idempotent event processing', () => {
  it.todo(
    '[PAY-003/AC1] Every processed Stripe event id is stored. Given the same event is delivered again, then it is answered 200, and nothing happens a second time (no …',
  );
  it.todo(
    '[PAY-003/AC2] Processing and storing the event id happen in one transaction. A failure answers 500, so Stripe retries.',
  );
  it.todo(
    '[PAY-003/AC3] State changes are monotonic. For example, a late checkout.session.expired after paid is ignored.',
  );
});

describe('PAY-004 — Successful payment', () => {
  it.todo(
    '[PAY-004/AC1] Given checkout.session.completed with payment_status=paid, or checkout.session.async_payment_succeeded, then the payment becomes paid, …',
  );
  it.todo(
    '[PAY-004/AC2] Given checkout.session.completed with payment_status=unpaid (delayed payment methods), then nothing is published yet.',
  );
  it.todo(
    '[PAY-004/AC3] Given the amount or currency in the session differs from the stored payment, then nothing is published and an error is logged for manual review.',
  );
});

describe('PAY-005 — Expired and failed payments', () => {
  it.todo(
    '[PAY-005/AC1] Given checkout.session.expired, then the payment becomes expired, and payment.expired { bookingId } is published.',
  );
  it.todo(
    '[PAY-005/AC2] Given checkout.session.async_payment_failed, then the payment becomes failed, and payment.failed { bookingId } is published.',
  );
  it.todo(
    '[PAY-005/AC3] payments.checkout.expire(bookingId) expires an open Stripe session on request (BOOK-008/AC3). A session that is already complete or expired is not an …',
  );
});

describe('PAY-006 — Refunds', () => {
  it.todo(
    '[PAY-006/AC1] payments.refunds.refundForBooking(bookingId) creates a full Stripe refund for the paid payment, with the idempotency key refund-<bookingId>, and sets …',
  );
  it.todo(
    '[PAY-006/AC2] Given the refund.updated / charge.refunded webhooks, then refundStatus becomes refunded or failed, and payment.refunded { bookingId } is published on …',
  );
  it.todo(
    '[PAY-006/AC3] Calling it for a booking without a paid payment is a no-op. Calling it twice creates a single refund.',
  );
});

describe('PAY-007 — All Stripe access behind a gateway port', () => {
  it.todo(
    '[PAY-007/AC1] Only modules/payments/stripe-gateway.ts imports the stripe SDK. Everything else uses the PaymentGateway interface (gateway.ts).',
  );
  it.todo(
    '[PAY-007/AC2] FakePaymentGateway (internal, in modules/payments/__tests__/fake-gateway.ts) records calls, can be told to fail, and builds signed webhook payloads, …',
  );
  it.todo(
    '[PAY-007/AC3] A contract test checks the real StripeGateway against stripe-mock when STRIPE_MOCK_URL is set. Otherwise it is skipped.',
  );
});

describe('PAY-008 — Payment status for other modules', () => {
  it.todo(
    '[PAY-008/AC1] payments.status.forBookings(ids) returns Map<bookingId, { status, refundStatus }> for the admin attendee list (BOOK-011).',
  );
});
