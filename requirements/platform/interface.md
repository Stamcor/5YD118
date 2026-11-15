# Platform — interface

What every module may rely on. Import from `apps/api/src/core/*`, never from another
module.

## Module definition (`core/module.ts`)

```ts
import { defineModule } from '../../core/module.js';

export default defineModule({
  name: 'booking',
  dependsOn: ['auth', 'scheduling', 'payments'],
  async register(app, ctx) {
    // ctx.config   – validated config (core/config.ts)
    // ctx.db       – drizzle database (core/db.ts)
    // ctx.clock    – Clock; use ctx.clock.now(), never `new Date()`, in domain logic
    // ctx.services – typed service registry: provide(key, impl) / require(key)
    // ctx.events   – domain event bus: publish(event) / subscribe(type, handler)
    app.get('/api/bookings', async () => ({ items: [] }));
  },
});
```

- The loader discovers `src/modules/*/index.ts` and registers modules in dependency order
  (`PLAT-007`).
- Service keys and event types are declared, with their TypeScript types, in the
  providing module's `public.ts` by **augmenting** `ServiceMap` / `EventMap` from
  `core/registry.ts`:

```ts
declare module '../../core/registry.js' {
  interface ServiceMap {
    'payments.checkout': CheckoutService;
  }
  interface EventMap {
    'payment.succeeded': { bookingId: string; paymentId: string };
  }
}
```

## Errors (`core/errors.ts`)

`throw new AppError('APPOINTMENT_FULL', 409, 'No seats left')`. Codes are typed by
`ErrorCode` from `@pilates/contracts`. Validation errors from zod are converted
automatically (`PLAT-003`).

## Request validation

Use `parse(Schema, request.body)` from `core/validation.ts` with a schema from
`@pilates/contracts`.

## Testing (`apps/api/test/helpers.ts`)

- `buildTestApp({ modules?, services?, now?, config? })` builds the app with test config,
  PGlite, a `FakeClock`, and service overrides. `modules` limits loading to the listed
  modules. Supply their dependencies' services as fakes from the dependencies'
  `testing.ts`. It returns `{ app, ctx, clock }`.
- `clock.advance({ minutes: 31 })` moves time.

## Frontend (`apps/{web,admin}/src/lib`)

- `api` — a fetch wrapper. It sends cookies, parses the response with a zod schema from
  `@pilates/contracts`, and throws `ApiError` (`code`, `status`).
- A feature exports `routes: AppRoute[]` from `src/features/<name>/routes.tsx`.
  `AppRoute` extends the react-router `RouteObject` with `requiresAuth?` and
  `nav?: { label, order }`.
