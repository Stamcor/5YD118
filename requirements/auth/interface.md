# Auth — interface

Other modules may rely on exactly this. Import it from
`apps/api/src/modules/auth/public.ts`.

## Route guards (service `auth.guards`)

```ts
const { requireUser, requireAdmin } = ctx.services.require('auth.guards');

app.get('/api/bookings', { preHandler: requireUser }, async (req) => {
  req.user; // AuthUser – set by the guard
});
app.post('/api/admin/courses', { preHandler: requireAdmin }, handler);
```

`AuthUser` is the `User` type from `@pilates/contracts` (`{ id, email, name, role }`).
`request.user` is declared in `core/request-user.ts`, so modules get the type without
importing auth.

- `requireUser` answers `401 UNAUTHENTICATED` when there is no valid session.
- `requireAdmin` additionally answers `403 FORBIDDEN` for members.

## Service `auth.users`

```ts
interface UserDirectory {
  /** Returns public user data (no hash) or null. */
  findById(id: string): Promise<AuthUser | null>;
  findManyByIds(ids: string[]): Promise<AuthUser[]>;
}
```

## Events

None in v1.

## Testing

Modules other than auth do **not** need the auth module's code in their tests. Use the
fakes in `apps/api/src/modules/auth/testing.ts`. The agent workspace always checks out a
dependency's `public.ts` and `testing.ts`:

```ts
const { app } = await buildTestApp({ modules: ['booking'], services: { ...fakeAuth() } });
await app.inject({ method: 'GET', url: '/api/bookings', headers: asUser({ role: 'member' }) });
// fakeAuth, asUser: import from '../../auth/testing.js'
```

`fakeAuth()` provides `auth.guards` and `auth.users`, backed by the `x-test-user` header.
It only exists in tests.

## HTTP contract

`packages/contracts/src/auth.ts`: `RegisterRequest`, `LoginRequest`, `UserResponse`.
