# Requirements

This tree is the **source of truth** for what the system must do. Code and tests
follow from it, not the other way round.

It is split so that an agent (or a developer) can work on **one module** with only
a small, predictable slice of the repository checked out. That slice is:

| Always                   | For the module you work on     | For each module it depends on     |
| ------------------------ | ------------------------------ | --------------------------------- |
| `requirements/README.md` | `requirements/<module>/` (all) | `requirements/<dep>/interface.md` |
| `requirements/_shared/`  |                                | `requirements/<dep>/module.json`  |

You never need another module's `spec.md`. If you think you do, the dependency's
`interface.md` is incomplete. Raise that as a change request (see below) instead of
reading or relying on its internals.

`node scripts/agent-workspace.mjs <module>` computes this slice, plus the matching
code paths, and can apply it as a git sparse checkout. See
[`docs/agent-workflow.md`](../docs/agent-workflow.md).

## Layout

```
requirements/
├── README.md              ← this file: format and rules
├── _shared/               ← small, stable context that every module needs
│   ├── glossary.md        ← the domain words, used the same way everywhere
│   ├── domain-model.md    ← entities, ownership, state machines
│   └── api-conventions.md ← HTTP, errors, auth, money, time
├── _templates/            ← copy these when adding a module or requirement
└── <module>/
    ├── module.json        ← machine-readable manifest: prefix, dependencies, code paths
    ├── spec.md            ← the requirements of this module (with IDs)
    └── interface.md       ← what other modules may rely on (the module's promise)
```

Modules and their dependencies (arrows point at what a module depends on):

```
platform ◀── auth ◀── courses ◀── scheduling ◀── booking ──▶ payments
   ▲          ▲                       ▲             │            │
   └──────────┴───────────────────────┴─────────────┴────────────┘ (everything uses platform)
```

| Module       | Prefix  | Owns                                                                   |
| ------------ | ------- | ---------------------------------------------------------------------- |
| `platform`   | `PLAT`  | App shells, config, errors, logging, security, event bus, migrations   |
| `auth`       | `AUTH`  | Accounts, login/logout, sessions, roles, admin provisioning            |
| `courses`    | `CRS`   | The course catalogue (what is offered)                                 |
| `scheduling` | `SCHED` | Appointments (dated occurrences of courses), the admin calendar        |
| `booking`    | `BOOK`  | Seat holds, bookings, capacity, cancellations, the member booking flow |
| `payments`   | `PAY`   | Stripe Checkout, webhooks, refunds. Knows nothing about seats          |

Dependencies must form a DAG. When two modules need to talk "backwards" (for example
payments telling booking that a payment succeeded) they use **domain events** or
**ports** that the depending module declares in its `interface.md`, never a direct
import.

## Requirement format

Each requirement in a `spec.md` is one level-3 heading with a stable ID:

```markdown
### BOOK-002 — Capacity is never exceeded

- **Priority:** Must
- **Status:** Approved
- **Layers:** api, e2e

**Story:** As the studio I want … so that ….

**Acceptance criteria**

1. **Given** …, **when** …, **then** ….
2. …

**Notes:** optional design hints, links to ADRs.
```

| Field    | Values                                                                                 |
| -------- | -------------------------------------------------------------------------------------- |
| Priority | `Must`, `Should`, `Could`, `Won't` (MoSCoW). `Won't` documents scope and is not traced |
| Status   | `Draft` → `Approved` → `Implemented` (or `Deprecated`)                                 |
| Layers   | Where tests are expected: `api`, `web`, `admin`, `contracts`, `e2e`                    |

Rules:

- **IDs are permanent.** Never renumber or reuse one. A deprecated requirement keeps
  its ID and gets `Status: Deprecated`.
- **One behaviour per requirement.** If an acceptance criterion needs its own story,
  it is a new requirement.
- Acceptance criteria are **testable**: Given/When/Then with concrete values, HTTP
  codes and error codes from `_shared/api-conventions.md`.
- Only `Approved` requirements are implemented. `Draft` means it is still being
  discussed.

## Traceability (tests ↔ requirements)

Every test references the requirement (and optionally the acceptance criterion) it
verifies, in its title:

```ts
it('[BOOK-002/AC1] only one of two concurrent requests gets the last seat', async () => { … });
it.todo('[BOOK-002/AC2] a full appointment returns 409 APPOINTMENT_FULL');
```

`pnpm req:trace` prints the matrix. `pnpm req:check` (run in CI) fails when:

1. a `Must`/`Should`/`Could` requirement that is `Approved` or `Implemented` has
   **no** test reference at all (planned `todo`/`fixme` tests count),
2. a requirement marked `Implemented` has **only** `todo` tests,
3. a test references an ID that does not exist (orphan),
4. the `Status` or `Priority` value is not one of the allowed values.

So the test-driven loop is: write the requirement, write `todo` tests for every
acceptance criterion, turn them into failing tests, make them pass, and set
`Status: Implemented`.

## Changing requirements

- A module's own `spec.md` is changed in the same PR as the code that implements it.
- A change to an `interface.md`, to `_shared/`, or to another module's spec is a
  **cross-module change**. Open it as its own PR (label `requirements`), and name the
  affected modules in the description. Agents working on a module must not edit
  another module's files. They describe the change they need in their PR instead.
