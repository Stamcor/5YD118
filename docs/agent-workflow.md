# Agent workflow: one module, minimal checkout

The repository is laid out so that an agent can develop one module with only the
slice it needs checked out. That slice is:

- its requirements,
- the shared requirement context,
- the **interfaces** (not specs) of its dependencies,
- its own code paths, plus the app shells, contracts and tooling,
- the `public.ts` (types) and `testing.ts` (fakes) of its dependencies.

The slice is computed from `requirements/<module>/module.json` by
`scripts/agent-workspace.mjs`. The script has no dependencies, and it reads the
manifests with `git show`, so it works before anything else is checked out.

## Start from a fresh, sparse clone

```bash
git clone --filter=blob:none --no-checkout <repo-url> pilates && cd pilates
git sparse-checkout set --no-cone '/*' '!/*/' '/scripts/'
git checkout main
node scripts/agent-workspace.mjs --list           # modules and their dependencies
node scripts/agent-workspace.mjs booking --apply  # narrow the checkout to "booking"
pnpm install
```

`--filter=blob:none` means file contents outside the slice are never downloaded.

## In an existing full clone

```bash
node scripts/agent-workspace.mjs booking --apply   # narrow
node scripts/agent-workspace.mjs --reset           # back to the full tree
```

## What you get (example: `booking`)

```
requirements/README.md, requirements/_shared/**, requirements/_templates/**
requirements/booking/**                                  ← full spec
requirements/{auth,scheduling,payments}/interface.md     ← dependencies: interfaces only
packages/**                                              ← contracts + web-kit
apps/api/** without src/modules/*, plus
  apps/api/src/modules/booking/**
  apps/api/src/modules/{auth,scheduling,payments}/{public,testing}.ts
apps/web/** without src/features/*, plus apps/web/src/features/booking/**
apps/admin/** without src/features/*, plus apps/admin/src/features/booking/**
e2e/** without tests/*, plus e2e/tests/booking/**
```

Print the exact patterns with `node scripts/agent-workspace.mjs booking`, and the reading
list with `--context`.

## Why it still builds and tests

- **Backend modules are discovered**, not listed (`src/core/module.ts`). Absent modules
  are simply not loaded.
- **Tests load only their own module** and replace dependencies with the fakes from the
  dependencies' `testing.ts`:

  ```ts
  import { fakeAuth, asUser } from '../../auth/testing.js';
  import { fakeAppointments, testAppointment } from '../../scheduling/testing.js';
  import { fakePayments } from '../../payments/testing.js';

  const payments = fakePayments();
  const appt = testAppointment({ capacity: 1 });
  const { app } = await buildTestApp({
    modules: ['booking'],
    services: { ...fakeAuth(), ...fakeAppointments([appt]), ...payments },
  });
  ```

- **Frontend routes are discovered** with `import.meta.glob('../features/*/routes.tsx')`.
- **`req:check` only judges what is present.** References to requirement prefixes whose
  specs are not checked out are not reported as orphans.
- `public.ts` files import only from `core` and `@pilates/contracts`, so a dependency's
  `public.ts` never pulls in more files.

## Running several agents in parallel

Modules can be built in any order, because every dependency is replaced by its fake.
A good plan:

| Wave | Modules                               | Notes                                                  |
| ---- | ------------------------------------- | ------------------------------------------------------ |
| 0    | `platform` (PLAT-004/005/006/008/012) | Migrations and CSRF first: other modules build on them |
| 1    | `auth`, `courses`, `payments`         | Independent of each other                              |
| 2    | `scheduling`, `booking`               | They use fakes until wave 1 has merged                 |
| 3    | e2e journeys                          | Once the real modules exist                            |

Give each agent its own branch (or worktree), one module, and this prompt:

> You work on module `<module>`. Run `node scripts/agent-workspace.mjs <module> --context`
> and read exactly those files and `AGENTS.md`. Implement the `Approved` requirements
> test-first: turn the `it.todo` tests in the module's `__tests__/` into failing tests,
> then make them pass. Do not edit files outside the module's paths. Run `pnpm verify`
> before you finish, and list any cross-module changes you need in the PR description.

## When the interface is not enough

If you need something a dependency's `interface.md` does not offer, **do not** read its
spec or code to work around it. Note it under "Cross-module changes needed" in your PR.
Use a fake that shows the shape you need in your own tests. A follow-up PR, by the
dependency's owner, updates `interface.md`, `public.ts`, `testing.ts` and the
implementation.
