# Courses — requirements

The catalogue of what the studio offers. A course has no date. Dates are
appointments (module `scheduling`).

### CRS-001 — Admin creates a course

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, admin

**Acceptance criteria**

1. **Given** an admin, **when** `POST /api/admin/courses` is called with `title` (3–120
   chars), `description` (≤ 4000 chars, plain text), `level` (`beginner` |
   `intermediate` | `advanced` | `all`), `durationMinutes` (15–240),
   `defaultCapacity` (1–100) and `defaultPriceCents` (≥ 50), **then** the course is
   created with status `active` and returned with `201`.
2. Invalid fields give `400` `VALIDATION_ERROR` with the failing paths.
3. The admin portal has a "New course" form with inline validation messages.

### CRS-002 — Admin edits a course

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, admin

**Acceptance criteria**

1. `PATCH /api/admin/courses/:id` updates any subset of the CRS-001 fields.
2. Changing `defaultCapacity`, `defaultPriceCents` or `durationMinutes` does **not**
   change appointments that already exist. Defaults apply only to new appointments.
3. An unknown id gives `404` `NOT_FOUND`.

### CRS-003 — Admin archives and restores a course

- **Priority:** Should
- **Status:** Approved
- **Layers:** api, admin

**Acceptance criteria**

1. `POST /api/admin/courses/:id/archive` sets status `archived`. `/restore` sets it back
   to `active`.
2. Members no longer see archived courses. New appointments cannot be created for them
   (enforced by scheduling through `courses.catalog`).
3. Existing appointments and bookings are not affected.
4. Courses are never hard-deleted.

### CRS-004 — Admin lists all courses

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, admin

**Acceptance criteria**

1. `GET /api/admin/courses` returns every course, including archived ones, sorted by
   title. It can be filtered with `?status=`.

### CRS-005 — Member sees available courses

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, web, e2e

**Story:** As a logged-in member I want to see which courses the studio offers so that
I can choose one to book.

**Acceptance criteria**

1. **Given** a logged-in member, **when** `GET /api/courses` is called, **then** only
   `active` courses are returned with `id, title, description, level, durationMinutes,
defaultPrice`, sorted by title.
2. **Given** no session, **then** the response is `401`. Public browsing is a later
   decision (see CRS-007).
3. The web `/courses` page lists the courses as cards. Each card links to
   `/courses/:id` and to `/schedule?courseId=:id`. The page shows an empty state when
   there are none.

### CRS-006 — Member sees course details

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, web

**Acceptance criteria**

1. `GET /api/courses/:id` returns the course. An archived or unknown id gives `404`.
2. The web page `/courses/:id` shows the course details and a primary "Show dates"
   link to `/schedule?courseId=:id`, which scheduling owns. Features link to each
   other only by URL. They never import each other.

### CRS-007 — Public course catalogue

- **Priority:** Could
- **Status:** Draft
- **Layers:** api, web

**Notes:** Lets anonymous visitors see `/courses`. Booking still requires login.
