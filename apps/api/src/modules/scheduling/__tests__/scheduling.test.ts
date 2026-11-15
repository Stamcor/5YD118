// Requirements: requirements/scheduling/spec.md
// TDD: pick a todo, turn it into a failing test, make it pass, repeat. When every AC of a
// requirement has a real test, set its Status to Implemented (checked by `pnpm req:check`).
import { describe, it } from 'vitest';

describe('SCHED-001 — Admin adds an appointment', () => {
  it.todo(
    '[SCHED-001/AC1] Given an active course, when POST /api/admin/appointments is called with courseId, startsAt (ISO UTC, in the future), location (1–120 chars) and …',
  );
  it.todo(
    "[SCHED-001/AC2] Omitted capacity/priceCents default to the course's defaultCapacity / defaultPriceCents. endsAt = startsAt + the course's durationMinutes.",
  );
  it.todo(
    '[SCHED-001/AC3] Given startsAt in the past, then 400 VALIDATION_ERROR. Given an archived or unknown course, then 422 COURSE_NOT_SCHEDULABLE.',
  );
});

describe('SCHED-002 — Admin adds a weekly series', () => {
  it.todo(
    '[SCHED-002/AC1] POST /api/admin/appointments/series with courseId, local time (HH:mm), weekdays (1–7), fromDate, toDate and the SCHED-001 fields creates one …',
  );
  it.todo(
    '[SCHED-002/AC2] Local wall-clock time is kept across DST changes. For example, 09:00 Europe/Berlin is 08:00Z in summer and 09:00Z in winter.',
  );
});

describe('SCHED-003 — Admin edits an appointment', () => {
  it.todo(
    '[SCHED-003/AC1] PATCH /api/admin/appointments/:id may change startsAt, location, instructor, capacity and priceCents of a scheduled, not-yet-started appointment.',
  );
  it.todo(
    '[SCHED-003/AC2] Given a new capacity below the seats currently taken (from scheduling.occupancy), then 409 CAPACITY_BELOW_BOOKED.',
  );
  it.todo(
    '[SCHED-003/AC3] A price change applies only to bookings created afterwards (bookings keep their price snapshot).',
  );
  it.todo('[SCHED-003/AC4] Each change publishes appointment.updated.');
  it.todo('[SCHED-003/AC5] Given a cancelled or started appointment, then 409 INVALID_STATE.');
});

describe('SCHED-004 — Admin cancels an appointment', () => {
  it.todo(
    '[SCHED-004/AC1] POST /api/admin/appointments/:id/cancel with an optional reason sets status cancelled and publishes appointment.cancelled. Booking reacts by …',
  );
  it.todo('[SCHED-004/AC3] Cancelling twice is idempotent: 200, no second event.');
});

describe('SCHED-005 — Admin calendar / list', () => {
  it.todo(
    '[SCHED-005/AC1] GET /api/admin/appointments?from=&to=&courseId=&status= returns appointments sorted by startsAt, each with courseTitle, capacity, seatsTaken and …',
  );
  it.todo(
    '[SCHED-005/AC2] The range defaults to today through +14 days and may be at most 92 days.',
  );
});

describe('SCHED-006 — Member sees bookable appointments', () => {
  it.todo(
    '[SCHED-006/AC1] GET /api/appointments?courseId=&from=&to= (logged-in) returns scheduled appointments of active courses that start after now, sorted by startsAt. Each …',
  );
  it.todo('[SCHED-006/AC2] Cancelled appointments and archived courses are not listed.');
});

describe('SCHED-007 — Appointment detail for members', () => {
  it.todo(
    '[SCHED-007/AC1] GET /api/appointments/:id returns the SCHED-006 shape for a scheduled or cancelled appointment. Cancelled ones have isBookable=false and status: …',
  );
});
