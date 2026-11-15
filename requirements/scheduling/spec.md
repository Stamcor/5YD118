# Scheduling — requirements

Appointments are the dated occurrences of courses. Admins add them in the admin portal.
Members see which ones are bookable.

Seat counts come from the `scheduling.occupancy` **port**. Scheduling declares it,
booking implements it. This keeps scheduling independent of booking (see interface).

### SCHED-001 — Admin adds an appointment

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, admin, e2e

**Story:** As an admin I want to add a date for a course so that members can book it.

**Acceptance criteria**

1. **Given** an active course, **when** `POST /api/admin/appointments` is called with
   `courseId`, `startsAt` (ISO UTC, in the future), `location` (1–120 chars) and optional
   `instructor`, `capacity` and `priceCents`, **then** the appointment is created with
   status `scheduled` and returned with `201`.
2. Omitted `capacity`/`priceCents` default to the course's `defaultCapacity` /
   `defaultPriceCents`. `endsAt` = `startsAt` + the course's `durationMinutes`.
3. **Given** `startsAt` in the past, **then** `400` `VALIDATION_ERROR`. **Given** an
   archived or unknown course, **then** `422` `COURSE_NOT_SCHEDULABLE`.
4. The admin portal has an "Add date" form. It picks the course, date and time **in the
   studio timezone**, prefills capacity and price from the course, and shows the
   computed end time.

### SCHED-002 — Admin adds a weekly series

- **Priority:** Should
- **Status:** Approved
- **Layers:** api, admin

**Acceptance criteria**

1. `POST /api/admin/appointments/series` with `courseId`, local `time` (HH:mm),
   `weekdays` (1–7), `fromDate`, `toDate` and the SCHED-001 fields creates one appointment
   per matching day. Every appointment shares a `seriesId`.
2. Local wall-clock time is kept across DST changes. For example, 09:00
   Europe/Berlin is 08:00Z in summer and 09:00Z in winter.
3. At most 52 appointments per request (`400` otherwise). `?dryRun=true` returns the
   computed dates without creating anything. The portal shows this preview before the
   admin confirms.

### SCHED-003 — Admin edits an appointment

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, admin

**Acceptance criteria**

1. `PATCH /api/admin/appointments/:id` may change `startsAt`, `location`, `instructor`,
   `capacity` and `priceCents` of a `scheduled`, not-yet-started appointment.
2. **Given** a new `capacity` below the seats currently taken (from
   `scheduling.occupancy`), **then** `409` `CAPACITY_BELOW_BOOKED`.
3. A price change applies only to bookings created afterwards (bookings keep their price
   snapshot).
4. Each change publishes `appointment.updated`.
5. **Given** a cancelled or started appointment, **then** `409` `INVALID_STATE`.

### SCHED-004 — Admin cancels an appointment

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, admin, e2e

**Acceptance criteria**

1. `POST /api/admin/appointments/:id/cancel` with an optional `reason` sets status
   `cancelled` and publishes `appointment.cancelled`. Booking reacts by cancelling every
   booking and refunding it (BOOK-009).
2. The portal asks for confirmation and states how many bookings will be refunded.
3. Cancelling twice is idempotent: `200`, no second event.

### SCHED-005 — Admin calendar / list

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, admin

**Acceptance criteria**

1. `GET /api/admin/appointments?from=&to=&courseId=&status=` returns appointments sorted
   by `startsAt`, each with `courseTitle`, `capacity`, `seatsTaken` and `seatsLeft`.
2. The range defaults to today through +14 days and may be at most 92 days.
3. The portal shows a week view and a list view. Each entry links to the attendee page
   (`/appointments/:id/attendees`, which booking owns).

### SCHED-006 — Member sees bookable appointments

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, web, e2e

**Story:** As a member I want to see upcoming dates with free seats so that I can pick
one.

**Acceptance criteria**

1. `GET /api/appointments?courseId=&from=&to=` (logged-in) returns `scheduled`
   appointments of active courses that start after now, sorted by `startsAt`. Each has
   `courseTitle`, `startsAt`, `endsAt`, `location`, `instructor`, `price`, `seatsLeft` and
   `isBookable` (see glossary). The default range is 8 weeks.
2. Cancelled appointments and archived courses are not listed.
3. The web `/schedule` page groups appointments by day (in the studio timezone) and can
   be filtered by course (`?courseId=`). Full appointments are shown as "Full" and
   cannot be selected. Selecting a bookable one navigates to `/book/:appointmentId`,
   which booking owns.

### SCHED-007 — Appointment detail for members

- **Priority:** Must
- **Status:** Approved
- **Layers:** api

**Acceptance criteria**

1. `GET /api/appointments/:id` returns the SCHED-006 shape for a scheduled or cancelled
   appointment. Cancelled ones have `isBookable=false` and `status: "cancelled"`.

### SCHED-008 — Location overlap warning

- **Priority:** Could
- **Status:** Draft
- **Layers:** api, admin

**Notes:** Warn (not block) when two appointments overlap at the same location.
