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

### Run everything in containers (podman or docker)

```bash
podman-compose up -d          # or: docker compose up -d
```

| URL                   | What                         |
| --------------------- | ---------------------------- |
| http://localhost:8080 | Member app                   |
| http://localhost:8081 | Admin portal                 |
| http://localhost:3000 | API (also proxied as `/api`) |

No `.env` is needed: every setting has a development default. Put real Stripe test keys
in `.env` and run `podman-compose --profile stripe up -d` to also forward Stripe
webhooks. Stop with `podman-compose down` (add `-v` to delete the database).

### Develop with hot reload

```bash
pnpm install
cp .env.example .env
podman-compose up -d postgres   # only the database
pnpm dev                        # api :3000 · web :5173 · admin :5174
```

The Stripe setup is in [docs/development.md](docs/development.md).

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
| `infra`              | Containerfiles and nginx config used by `compose.yaml`                             |
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
