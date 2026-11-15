# 5YD118 — Pilates Booking System

Members log in, browse the studio's courses, pick a date and **book and pay right away
with Stripe**. Staff manage courses and dates in a separate **admin portal**.

- **Requirements-driven:** [`requirements/`](requirements/README.md) is the source of
  truth. It is split per module, so each module can be developed with only its own
  slice checked out.
- **Test-driven:** every acceptance criterion has a test tagged with its ID
  (`[BOOK-002/AC1]`). `pnpm req:check` enforces the link in CI.
- **Modular:** a modular-monolith API, two React apps, and one zod contract package.
  See [docs/architecture.md](docs/architecture.md).

## Quick start

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm dev
```

Open http://localhost:5173 (members) and http://localhost:5174 (admin). The Stripe
setup is in [docs/development.md](docs/development.md).

## Layout

| Path                 | What                                                                               |
| -------------------- | ---------------------------------------------------------------------------------- |
| `requirements/`      | Specs per module (`spec.md`), their interfaces, shared glossary and domain model   |
| `apps/api`           | Fastify API. `src/core` = platform, `src/modules/*` = business modules             |
| `apps/web`           | Member app                                                                         |
| `apps/admin`         | Admin portal                                                                       |
| `packages/contracts` | zod schemas of the HTTP API (shared by all apps)                                   |
| `packages/web-kit`   | Shared frontend shell                                                              |
| `e2e`                | Playwright journeys                                                                |
| `scripts`            | `req-trace.mjs` (traceability), `agent-workspace.mjs` (sparse checkout per module) |
| `docs`               | Architecture, ADRs, development and agent workflows                                |

## Modules

| Module       | Prefix | Owns                                                        |
| ------------ | ------ | ----------------------------------------------------------- |
| `platform`   | PLAT   | Config, errors, module loader, events, security, app shells |
| `auth`       | AUTH   | Registration, login, sessions, roles                        |
| `courses`    | CRS    | Course catalogue                                            |
| `scheduling` | SCHED  | Appointments (dates). The admin calendar                    |
| `booking`    | BOOK   | Seats, bookings, cancellations, the book-and-pay flow       |
| `payments`   | PAY    | Stripe Checkout, webhooks, refunds                          |

## For agents

Start with [AGENTS.md](AGENTS.md) and [docs/agent-workflow.md](docs/agent-workflow.md):

```bash
node scripts/agent-workspace.mjs booking --context   # what to read
node scripts/agent-workspace.mjs booking --apply     # sparse-checkout only that slice
```
