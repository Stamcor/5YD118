# Booking — requirements

A member selects an appointment, books it, and pays right away with Stripe. Booking
owns seats and the booking lifecycle (see `_shared/domain-model.md`). It uses
`payments` to collect and refund money, and reacts to payment events.

### BOOK-001 — Member books an appointment and goes straight to payment

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, web, e2e

**Story:** As a member I want to book a selected appointment and pay immediately so that
my seat is secured in one flow.

**Acceptance criteria**

1. **Given** a logged-in member and a bookable appointment, **when**
   `POST /api/bookings { appointmentId }` is called, **then** in **one transaction** a
   booking `pending_payment` is created. It holds a seat until now +
   `BOOKING_HOLD_MINUTES` and snapshots the appointment price and currency. Then a
   checkout is created through `payments.checkout`. The response is `201`
   `{ booking, checkoutUrl }`.
2. The checkout amount is the booking's price snapshot. The request body accepts no
   price, and any extra field is rejected (`400`).
3. The held seat reduces `seatsLeft` immediately.
4. **Given** `payments.checkout` fails, **then** the booking is not kept (seat released),
   and the response is `502` `PAYMENT_PROVIDER_ERROR`.
5. The web page `/book/:appointmentId` shows the course, date and time (studio
   timezone), location, price and the cancellation policy, with one primary button,
   "Book & pay". Clicking it calls the endpoint and redirects the browser to
   `checkoutUrl`. While the request runs, the button is disabled so it cannot be
   submitted twice.

### BOOK-002 — Capacity is never exceeded

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. **Given** an appointment with 1 seat left, **when** two members book it concurrently,
   **then** exactly one gets `201` and the other gets `409` `APPOINTMENT_FULL`. This is
   enforced with a transaction-scoped advisory lock on the appointment id
   (`pg_advisory_xact_lock`), taken before the seat count. The test runs against real
   Postgres (PLAT-012).
2. **Given** `seatsLeft = 0`, **then** `409` `APPOINTMENT_FULL`.
3. Expired holds do not count as taken seats, even before a background job has marked
   them `expired`.

### BOOK-003 — One active booking per member and appointment

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. **Given** the member already has a `confirmed` booking for the appointment, **then**
   `409` `ALREADY_BOOKED`.
2. **Given** the member has a `pending_payment` booking with an unexpired hold, **then**
   the response is `200` with the **same** booking and its existing `checkoutUrl`
   (resume payment). No second seat is taken.

### BOOK-004 — Only bookable appointments can be booked

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. **Given** the appointment is cancelled, has started, starts within
   `BOOKING_CUTOFF_MINUTES`, or its course is archived, **then** `422`
   `APPOINTMENT_NOT_BOOKABLE`.
2. **Given** an unknown appointment id, **then** `404` `NOT_FOUND`.
3. **Given** no session, **then** `401`.

### BOOK-005 — Seat holds expire

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. **Given** a `pending_payment` booking whose `holdExpiresAt` has passed, **then** its
   seat is free again (BOOK-002/AC3), and the sweeper (`expireStaleHolds()`, run every
   minute) moves it to `expired`.
2. **Given** a `payment.expired` or `payment.failed` event for a pending booking,
   **then** the booking becomes `expired`.
3. Expiring is idempotent and never touches a booking that is not `pending_payment`.

### BOOK-006 — Booking is confirmed only by a verified payment

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, web

**Acceptance criteria**

1. **Given** a `payment.succeeded` event for a `pending_payment` booking, **then** it
   becomes `confirmed` with `confirmedAt`. Handling the same event twice changes nothing
   further.
2. **Given** `payment.succeeded` for an `expired` booking and a seat is still free,
   **then** it becomes `confirmed`. **Given** no seat is free, **then** it stays `expired`
   and `payments.refunds.refundForBooking(bookingId)` is called.
3. The Stripe success redirect alone **never** confirms a booking. The return page
   `/bookings/:id/return` polls `GET /api/bookings/:id` (every 2 s, for up to 60 s) and
   shows "Confirmed", "Payment processing…" or "Payment not completed — try again".
4. `GET /api/bookings/:id` returns `404` for bookings of other members.

### BOOK-007 — Member sees their bookings

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, web

**Acceptance criteria**

1. `GET /api/bookings?scope=upcoming|past` returns the member's bookings with
   appointment details, status, price, and `canCancel`. Upcoming ones are sorted
   ascending, past ones descending.
2. `expired` bookings are listed only under `past`.
3. The web `/bookings` page shows upcoming and past tabs. A pending booking has a
   "Complete payment" action (BOOK-003/AC2).

### BOOK-008 — Member cancels a booking

- **Priority:** Should
- **Status:** Approved
- **Layers:** api, web, e2e

**Acceptance criteria**

1. **Given** a `confirmed` booking and now is earlier than start −
   `CANCELLATION_DEADLINE_HOURS`, **when** `POST /api/bookings/:id/cancel` is called,
   **then** it becomes `cancelled`, the seat is freed, and a full refund is requested.
   The response is `200`.
2. **Given** the deadline has passed, **then** `409` `CANCELLATION_CLOSED`.
3. **Given** a `pending_payment` booking, **then** it becomes `cancelled`, the hold is
   released, and `payments.checkout.expire(bookingId)` is called.
4. **Given** a booking in a terminal state, **then** `409` `INVALID_STATE`.

### BOOK-009 — Studio cancellation cancels and refunds all bookings

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. **Given** an `appointment.cancelled` event, **then** every `confirmed` booking for it
   becomes `cancelled_by_studio`, and a full refund is requested for each one.
2. Every `pending_payment` booking becomes `expired`, and its checkout is expired.
3. Handling the event twice requests no second refund.

### BOOK-010 — Occupancy for scheduling

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. Booking provides the `scheduling.occupancy` port. `seatsTaken(ids)` counts `confirmed`
   bookings plus `pending_payment` bookings with an unexpired hold.

### BOOK-011 — Admin sees the attendees of an appointment

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, admin

**Acceptance criteria**

1. `GET /api/admin/appointments/:id/bookings` returns every booking with member name,
   email, status, `createdAt` and payment status (from `payments.status`).
2. The admin page `/appointments/:id/attendees` lists confirmed attendees first, shows
   the counts per status, and has a print-friendly view.

### BOOK-012 — Booking confirmation email

- **Priority:** Could
- **Status:** Draft
- **Layers:** api

**Notes:** Stripe sends a receipt in v1. A studio-branded confirmation, with an `.ics`
attachment, needs an email provider ADR.

### BOOK-013 — Waitlist

- **Priority:** Won't
- **Status:** Draft
- **Layers:** api

**Notes:** Out of scope for v1. Documented so nobody builds it by accident.
