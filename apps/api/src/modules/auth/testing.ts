// Fakes of auth's services for OTHER modules' tests. See requirements/auth/interface.md.
import { randomUUID } from 'node:crypto';
import { AppError } from '../../core/errors.js';
import type { AuthGuards, AuthUser, UserDirectory } from './public.js';

const HEADER = 'x-test-user';

export function testUser(partial: Partial<AuthUser> = {}): AuthUser {
  const id = partial.id ?? randomUUID();
  return {
    id,
    email: partial.email ?? `member-${id.slice(0, 8)}@example.test`,
    name: partial.name ?? 'Test Member',
    role: partial.role ?? 'member',
  };
}

/** Headers that make the fake guards treat the request as coming from `user`. */
export function asUser(partial: Partial<AuthUser> = {}): Record<string, string> {
  return { [HEADER]: JSON.stringify(testUser(partial)) };
}

export function fakeAuth(knownUsers: AuthUser[] = []): {
  'auth.guards': AuthGuards;
  'auth.users': UserDirectory & { add(user: AuthUser): void };
} {
  const users = new Map(knownUsers.map((u) => [u.id, u]));
  const readUser = (raw: string | string[] | undefined): AuthUser | undefined => {
    if (typeof raw !== 'string') return undefined;
    const user = JSON.parse(raw) as AuthUser;
    users.set(user.id, user);
    return user;
  };
  return {
    'auth.guards': {
      async requireUser(request) {
        const user = readUser(request.headers[HEADER]);
        if (!user) throw new AppError('UNAUTHENTICATED', 401, 'Login required');
        request.user = user;
      },
      async requireAdmin(request) {
        const user = readUser(request.headers[HEADER]);
        if (!user) throw new AppError('UNAUTHENTICATED', 401, 'Login required');
        if (user.role !== 'admin') throw new AppError('FORBIDDEN', 403, 'Admins only');
        request.user = user;
      },
    },
    'auth.users': {
      add: (u) => void users.set(u.id, u),
      findById: async (id) => users.get(id) ?? null,
      findManyByIds: async (ids) => ids.flatMap((id) => users.get(id) ?? []),
    },
  };
}
