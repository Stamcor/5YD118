// Requirements: requirements/scheduling/spec.md (UI acceptance criteria)
import { describe, it } from 'vitest';

describe('SCHED-001 — Admin adds an appointment', () => {
  it.todo(
    '[SCHED-001/AC4] The admin portal has an "Add date" form. It picks the course, date and time in the studio timezone, prefills capacity and price from the course, and …',
  );
});

describe('SCHED-002 — Admin adds a weekly series', () => {
  it.todo(
    '[SCHED-002/AC3] At most 52 appointments per request (400 otherwise). ?dryRun=true returns the computed dates without creating anything. The portal shows this preview …',
  );
});

describe('SCHED-003 — Admin edits an appointment', () => {
  it.todo('[SCHED-003] Admin edits an appointment');
});

describe('SCHED-004 — Admin cancels an appointment', () => {
  it.todo(
    '[SCHED-004/AC2] The portal asks for confirmation and states how many bookings will be refunded.',
  );
});

describe('SCHED-005 — Admin calendar / list', () => {
  it.todo(
    '[SCHED-005/AC3] The portal shows a week view and a list view. Each entry links to the attendee page (/appointments/:id/attendees, which booking owns).',
  );
});
