// Requirements: requirements/courses/spec.md
// TDD: pick a todo, turn it into a failing test, make it pass, repeat. When every AC of a
// requirement has a real test, set its Status to Implemented (checked by `pnpm req:check`).
import { describe, it } from 'vitest';

describe('CRS-001 — Admin creates a course', () => {
  it.todo(
    '[CRS-001/AC1] Given an admin, when POST /api/admin/courses is called with title (3–120 chars), description (≤ 4000 chars, plain text), level (beginner | …',
  );
  it.todo('[CRS-001/AC2] Invalid fields give 400 VALIDATION_ERROR with the failing paths.');
});

describe('CRS-002 — Admin edits a course', () => {
  it.todo('[CRS-002/AC1] PATCH /api/admin/courses/:id updates any subset of the CRS-001 fields.');
  it.todo(
    '[CRS-002/AC2] Changing defaultCapacity, defaultPriceCents or durationMinutes does not change appointments that already exist. Defaults apply only to new …',
  );
  it.todo('[CRS-002/AC3] An unknown id gives 404 NOT_FOUND.');
});

describe('CRS-003 — Admin archives and restores a course', () => {
  it.todo(
    '[CRS-003/AC1] POST /api/admin/courses/:id/archive sets status archived. /restore sets it back to active.',
  );
  it.todo(
    '[CRS-003/AC2] Members no longer see archived courses. New appointments cannot be created for them (enforced by scheduling through courses.catalog).',
  );
  it.todo('[CRS-003/AC3] Existing appointments and bookings are not affected.');
  it.todo('[CRS-003/AC4] Courses are never hard-deleted.');
});

describe('CRS-004 — Admin lists all courses', () => {
  it.todo(
    '[CRS-004/AC1] GET /api/admin/courses returns every course, including archived ones, sorted by title. It can be filtered with ?status=.',
  );
});

describe('CRS-005 — Member sees available courses', () => {
  it.todo(
    '[CRS-005/AC1] Given a logged-in member, when GET /api/courses is called, then only active courses are returned with id, title, description, level, durationMinutes, …',
  );
  it.todo(
    '[CRS-005/AC2] Given no session, then the response is 401. Public browsing is a later decision (see CRS-007).',
  );
});

describe('CRS-006 — Member sees course details', () => {
  it.todo(
    '[CRS-006/AC1] GET /api/courses/:id returns the course. An archived or unknown id gives 404.',
  );
});
