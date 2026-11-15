// Requirements: requirements/booking/spec.md (UI acceptance criteria)
import { describe, it } from 'vitest';

describe('BOOK-001 — Member books an appointment and goes straight to payment', () => {
  it.todo(
    '[BOOK-001/AC5] The web page /book/:appointmentId shows the course, date and time (studio timezone), location, price and the cancellation policy, with one primary …',
  );
});

describe('BOOK-006 — Booking is confirmed only by a verified payment', () => {
  it.todo(
    '[BOOK-006/AC3] The Stripe success redirect alone never confirms a booking. The return page /bookings/:id/return polls GET /api/bookings/:id (every 2 s, for up to 60 …',
  );
});

describe('BOOK-007 — Member sees their bookings', () => {
  it.todo(
    '[BOOK-007/AC3] The web /bookings page shows upcoming and past tabs. A pending booking has a "Complete payment" action (BOOK-003/AC2).',
  );
});

describe('BOOK-008 — Member cancels a booking', () => {
  it.todo('[BOOK-008] Member cancels a booking');
});
