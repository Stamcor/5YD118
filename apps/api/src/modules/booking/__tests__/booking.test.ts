// Requirements: requirements/booking/spec.md
// TDD: pick a todo, turn it into a failing test, make it pass, repeat. When every AC of a
// requirement has a real test, set its Status to Implemented (checked by `pnpm req:check`).
import { describe, it } from 'vitest';

describe('BOOK-001 — Member books an appointment and goes straight to payment', () => {
  it.todo(
    '[BOOK-001/AC1] Given a logged-in member and a bookable appointment, when POST /api/bookings { appointmentId } is called, then in one transaction a booking …',
  );
  it.todo(
    "[BOOK-001/AC2] The checkout amount is the booking's price snapshot. The request body accepts no price, and any extra field is rejected (400).",
  );
  it.todo('[BOOK-001/AC3] The held seat reduces seatsLeft immediately.');
  it.todo(
    '[BOOK-001/AC4] Given payments.checkout fails, then the booking is not kept (seat released), and the response is 502 PAYMENT_PROVIDER_ERROR.',
  );
});

describe('BOOK-002 — Capacity is never exceeded', () => {
  it.todo(
    '[BOOK-002/AC1] Given an appointment with 1 seat left, when two members book it concurrently, then exactly one gets 201 and the other gets 409 APPOINTMENT_FULL. This …',
  );
  it.todo('[BOOK-002/AC2] Given seatsLeft = 0, then 409 APPOINTMENT_FULL.');
  it.todo(
    '[BOOK-002/AC3] Expired holds do not count as taken seats, even before a background job has marked them expired.',
  );
});

describe('BOOK-003 — One active booking per member and appointment', () => {
  it.todo(
    '[BOOK-003/AC1] Given the member already has a confirmed booking for the appointment, then 409 ALREADY_BOOKED.',
  );
  it.todo(
    '[BOOK-003/AC2] Given the member has a pending_payment booking with an unexpired hold, then the response is 200 with the same booking and its existing checkoutUrl …',
  );
});

describe('BOOK-004 — Only bookable appointments can be booked', () => {
  it.todo(
    '[BOOK-004/AC1] Given the appointment is cancelled, has started, starts within BOOKING_CUTOFF_MINUTES, or its course is archived, then 422 APPOINTMENT_NOT_BOOKABLE.',
  );
  it.todo('[BOOK-004/AC2] Given an unknown appointment id, then 404 NOT_FOUND.');
  it.todo('[BOOK-004/AC3] Given no session, then 401.');
});

describe('BOOK-005 — Seat holds expire', () => {
  it.todo(
    '[BOOK-005/AC1] Given a pending_payment booking whose holdExpiresAt has passed, then its seat is free again (BOOK-002/AC3), and the sweeper (expireStaleHolds(), run …',
  );
  it.todo(
    '[BOOK-005/AC2] Given a payment.expired or payment.failed event for a pending booking, then the booking becomes expired.',
  );
  it.todo(
    '[BOOK-005/AC3] Expiring is idempotent and never touches a booking that is not pending_payment.',
  );
});

describe('BOOK-006 — Booking is confirmed only by a verified payment', () => {
  it.todo(
    '[BOOK-006/AC1] Given a payment.succeeded event for a pending_payment booking, then it becomes confirmed with confirmedAt. Handling the same event twice changes …',
  );
  it.todo(
    '[BOOK-006/AC2] Given payment.succeeded for an expired booking and a seat is still free, then it becomes confirmed. Given no seat is free, then it stays expired and …',
  );
  it.todo('[BOOK-006/AC4] GET /api/bookings/:id returns 404 for bookings of other members.');
});

describe('BOOK-007 — Member sees their bookings', () => {
  it.todo(
    "[BOOK-007/AC1] GET /api/bookings?scope=upcoming|past returns the member's bookings with appointment details, status, price, and canCancel. Upcoming ones are sorted …",
  );
  it.todo('[BOOK-007/AC2] expired bookings are listed only under past.');
});

describe('BOOK-008 — Member cancels a booking', () => {
  it.todo(
    '[BOOK-008/AC1] Given a confirmed booking and now is earlier than start − CANCELLATION_DEADLINE_HOURS, when POST /api/bookings/:id/cancel is called, then it becomes …',
  );
  it.todo('[BOOK-008/AC2] Given the deadline has passed, then 409 CANCELLATION_CLOSED.');
  it.todo(
    '[BOOK-008/AC3] Given a pending_payment booking, then it becomes cancelled, the hold is released, and payments.checkout.expire(bookingId) is called.',
  );
  it.todo('[BOOK-008/AC4] Given a booking in a terminal state, then 409 INVALID_STATE.');
});

describe('BOOK-009 — Studio cancellation cancels and refunds all bookings', () => {
  it.todo(
    '[BOOK-009/AC1] Given an appointment.cancelled event, then every confirmed booking for it becomes cancelled_by_studio, and a full refund is requested for each one.',
  );
  it.todo(
    '[BOOK-009/AC2] Every pending_payment booking becomes expired, and its checkout is expired.',
  );
  it.todo('[BOOK-009/AC3] Handling the event twice requests no second refund.');
});

describe('BOOK-010 — Occupancy for scheduling', () => {
  it.todo(
    '[BOOK-010/AC1] Booking provides the scheduling.occupancy port. seatsTaken(ids) counts confirmed bookings plus pending_payment bookings with an unexpired hold.',
  );
});

describe('BOOK-011 — Admin sees the attendees of an appointment', () => {
  it.todo(
    '[BOOK-011/AC1] GET /api/admin/appointments/:id/bookings returns every booking with member name, email, status, createdAt and payment status (from payments.status).',
  );
});
