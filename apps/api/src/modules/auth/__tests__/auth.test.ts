// Requirements: requirements/auth/spec.md
// TDD: pick a todo, turn it into a failing test, make it pass, repeat. When every AC of a
// requirement has a real test, set its Status to Implemented (checked by `pnpm req:check`).
import { describe, it } from 'vitest';

describe('AUTH-001 — Member registration', () => {
  it.todo(
    '[AUTH-001/AC1] Given a valid name, email and a password of at least 12 characters, when POST /api/auth/register is called, then a user with role member is created, …',
  );
  it.todo(
    '[AUTH-001/AC2] Emails are trimmed and lower-cased. Given the email already exists (in any letter case), then the response is 409 EMAIL_TAKEN.',
  );
  it.todo(
    '[AUTH-001/AC3] Given a password shorter than 12 characters or an invalid email, then the response is 400 VALIDATION_ERROR.',
  );
  it.todo('[AUTH-001/AC4] Passwords are stored only as an argon2id hash.');
});

describe('AUTH-002 — Login', () => {
  it.todo(
    '[AUTH-002/AC1] Given correct credentials, when POST /api/auth/login is called, then the response is 200 with the user and sets the sid cookie (httpOnly, …',
  );
  it.todo(
    '[AUTH-002/AC2] Given a wrong password or an unknown email, then the response is 401 INVALID_CREDENTIALS with an identical body. Response time does not reveal which …',
  );
});

describe('AUTH-003 — Logout', () => {
  it.todo(
    '[AUTH-003/AC1] POST /api/auth/logout deletes the session server-side and clears the cookie (204).',
  );
  it.todo('[AUTH-003/AC2] Given a logged-out session id, then later requests with it get 401.');
});

describe('AUTH-004 — Current user', () => {
  it.todo(
    '[AUTH-004/AC1] GET /api/auth/me returns 200 with { id, email, name, role } for a valid session.',
  );
  it.todo('[AUTH-004/AC2] Without a valid session it returns 401 UNAUTHENTICATED.');
});

describe('AUTH-005 — Role-based access control', () => {
  it.todo(
    '[AUTH-005/AC1] Route guards requireUser and requireAdmin are provided to all modules (see interface).',
  );
  it.todo(
    '[AUTH-005/AC2] Given no session, when an /api/admin/* route is called, then the response is 401 UNAUTHENTICATED. Given a member session, then it is 403 FORBIDDEN.',
  );
  it.todo(
    '[AUTH-005/AC3] Given an admin session, then member endpoints work as well (admins can book).',
  );
});

describe('AUTH-006 — Admin provisioning', () => {
  it.todo(
    '[AUTH-006/AC1] Admins cannot be created through any HTTP endpoint. role in a registration body is ignored.',
  );
  it.todo(
    '[AUTH-006/AC2] pnpm --filter @pilates/api admin:create --email … --name … creates an admin (or promotes an existing user). It prompts for a password or reads it …',
  );
});

describe('AUTH-007 — Session lifetime', () => {
  it.todo(
    '[AUTH-007/AC1] Member sessions expire 14 days after last use (sliding). Admin sessions expire 12 hours after login (absolute).',
  );
  it.todo(
    '[AUTH-007/AC2] Given an expired session, then requests get 401 and the session row is deleted.',
  );
});

describe('AUTH-008 — Login rate limiting', () => {
  it.todo(
    '[AUTH-008/AC1] Given 5 failed logins for the same email within 15 minutes, then the next attempt is answered 429 RATE_LIMITED until the window passes, even with the …',
  );
  it.todo('[AUTH-008/AC2] A successful login resets the counter.');
});
