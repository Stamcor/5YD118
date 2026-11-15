# Architecture Decision Records

One file per decision: `NNNN-title.md`, using the template below. Decisions are
immutable. To change one, write a new ADR that supersedes it.

| ADR                                  | Title                                            | Status   |
| ------------------------------------ | ------------------------------------------------ | -------- |
| [0001](0001-stack-and-monorepo.md)   | TypeScript monorepo and stack                    | Accepted |
| [0002](0002-requirements-as-code.md) | Requirements as code, split per module           | Accepted |
| [0003](0003-module-boundaries.md)    | Module boundaries: public.ts, testing.ts, events | Accepted |
| [0004](0004-stripe-checkout.md)      | Stripe Checkout with webhook confirmation        | Accepted |
| [0005](0005-cookie-sessions.md)      | Server-side sessions instead of JWTs             | Accepted |

## Template

```markdown
# NNNN — Title

- **Status:** Proposed | Accepted | Superseded by NNNN
- **Date:** YYYY-MM-DD

## Context

## Decision

## Consequences
```
