# 0002 — Requirements as code, split per module

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

Development is requirements-driven and test-driven, and much of it is done by agents.
An agent working on one part should not need to load all requirements into its
context, and it should not be tempted to depend on other modules' internals.

## Decision

- Requirements live in the repository, in `requirements/<module>/spec.md`, with stable
  IDs (`BOOK-002`) and Given/When/Then acceptance criteria.
- Each module has an `interface.md`. It is the **only** document other modules may rely
  on. Shared context is kept small, in `requirements/_shared/`.
- `module.json` declares dependencies and code paths. `scripts/agent-workspace.mjs`
  turns it into a git sparse checkout of exactly the module's slice.
- Tests reference requirement IDs in their titles. `scripts/req-trace.mjs --strict`
  runs in CI and fails on untested approved requirements, on `Implemented` requirements
  without real tests, and on orphan references.

## Consequences

- Specs, code and tests change in the same PR, so the specs stay true.
- Agents get a small, deterministic context per module.
- Cross-module changes are visible: they touch `interface.md` or `_shared/`.
- Some discipline is required. Interfaces must be kept complete, or agents will be
  blocked.
