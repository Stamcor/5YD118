# 0005 — Server-side sessions instead of JWTs

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

The browser apps and the API share a site. We need logout that really logs out, and
short-lived admin sessions.

## Decision

- Opaque session ids are stored in Postgres and sent as an `httpOnly`, `Secure`,
  `SameSite=Lax` cookie.
- Passwords are hashed with argon2id.
- CSRF protection comes from `SameSite=Lax` plus a strict `Origin` check on every
  state-changing request (PLAT-005).

## Consequences

- Sessions can be revoked instantly, and there are no tokens in JS-accessible storage.
- Each request costs one indexed lookup, which is negligible at studio scale.
