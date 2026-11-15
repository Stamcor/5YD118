# Auth — requirements

Accounts, sessions and roles for members and admins.

### AUTH-001 — Member registration

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api, web, e2e

**Story:** As a visitor I want to create an account so that I can book appointments.

**Acceptance criteria**

1. **Given** a valid name, email and a password of at least 12 characters, **when**
   `POST /api/auth/register` is called, **then** a user with role `member` is created,
   the response is `201` with the user (without any password data), and the member is
   logged in (session cookie set).
2. Emails are trimmed and lower-cased. **Given** the email already exists (in any
   letter case), **then** the response is `409` `EMAIL_TAKEN`.
3. **Given** a password shorter than 12 characters or an invalid email, **then** the
   response is `400` `VALIDATION_ERROR`.
4. Passwords are stored only as an argon2id hash.
5. The web app has a registration page. After it succeeds, the member goes to `next`
   (if given) or to `/courses`.

### AUTH-002 — Login

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api, web, e2e

**Acceptance criteria**

1. **Given** correct credentials, **when** `POST /api/auth/login` is called, **then** the
   response is `200` with the user and sets the `sid` cookie (`httpOnly`,
   `SameSite=Lax`, `Secure` outside development).
2. **Given** a wrong password or an unknown email, **then** the response is `401`
   `INVALID_CREDENTIALS` with an identical body. Response time does not reveal which
   one it was (a dummy hash is verified for unknown emails).
3. The web login page redirects to `next` after success.

### AUTH-003 — Logout

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api, web

**Acceptance criteria**

1. `POST /api/auth/logout` deletes the session server-side and clears the cookie (`204`).
2. **Given** a logged-out session id, **then** later requests with it get `401`.

### AUTH-004 — Current user

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Acceptance criteria**

1. `GET /api/auth/me` returns `200` with `{ id, email, name, role }` for a valid session.
2. Without a valid session it returns `401` `UNAUTHENTICATED`.

### AUTH-005 — Role-based access control

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Acceptance criteria**

1. Route guards `requireUser` and `requireAdmin` are provided to all modules (see
   interface).
2. **Given** no session, **when** an `/api/admin/*` route is called, **then** the response
   is `401` `UNAUTHENTICATED`. **Given** a member session, **then** it is `403`
   `FORBIDDEN`.
3. **Given** an admin session, **then** member endpoints work as well (admins can book).

### AUTH-006 — Admin provisioning

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Acceptance criteria**

1. Admins cannot be created through any HTTP endpoint. `role` in a registration body is
   ignored.
2. `pnpm --filter @pilates/api admin:create --email … --name …` creates an admin (or
   promotes an existing user). It prompts for a password or reads it from stdin.

### AUTH-007 — Session lifetime

- **Priority:** Must
- **Status:** Implemented
- **Layers:** api

**Acceptance criteria**

1. Member sessions expire 14 days after last use (sliding). Admin sessions expire 12
   hours after login (absolute).
2. **Given** an expired session, **then** requests get `401` and the session row is
   deleted.

### AUTH-008 — Login rate limiting

- **Priority:** Should
- **Status:** Implemented
- **Layers:** api

**Acceptance criteria**

1. **Given** 5 failed logins for the same email within 15 minutes, **then** the next
   attempt is answered `429` `RATE_LIMITED` until the window passes, even with the
   correct password.
2. A successful login resets the counter.

### AUTH-009 — Admin portal login

- **Priority:** Must
- **Status:** Implemented
- **Layers:** admin, e2e

**Acceptance criteria**

1. The admin portal shows only a login page to anonymous users.
2. **Given** a member logs in to the admin portal, **then** they see "This portal is for
   studio staff". Their session is not used there.

### AUTH-010 — Password reset by email

- **Priority:** Could
- **Status:** Draft
- **Layers:** api, web

**Notes:** Needs an email provider (ADR pending). The reset token is single-use and
expires after 1 hour, and every session is revoked after a reset.
