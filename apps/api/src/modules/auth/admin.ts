// AUTH-006 — admins are provisioned from the command line only.
import { eq } from 'drizzle-orm';
import { systemClock, type Clock } from '../../core/clock.js';
import type { Db } from '../../core/db.js';
import { newId } from '../../core/ids.js';
import { MIN_PASSWORD_LENGTH, hashPassword } from './passwords.js';
import { authUsers } from './schema.js';

export interface CreateAdminInput {
  email: string;
  name: string;
  password: string;
}

/** Create an admin, or promote an existing user (and set the given password). */
export async function createAdmin(
  db: Db,
  input: CreateAdminInput,
  clock: Clock = systemClock,
): Promise<'created' | 'promoted'> {
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const [existing] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email));
  if (existing) {
    await db
      .update(authUsers)
      .set({ role: 'admin', passwordHash })
      .where(eq(authUsers.id, existing.id));
    return 'promoted';
  }
  await db.insert(authUsers).values({
    id: newId(),
    email,
    name: input.name.trim() || email,
    role: 'admin',
    passwordHash,
    createdAt: clock.now(),
  });
  return 'created';
}

export function parseCreateAdminArgs(argv: string[]): { email: string; name: string } {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const email = get('--email')?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error(
      'Usage: admin:create --email <email> [--name <name>]  (password from prompt or stdin)',
    );
  }
  return { email, name: get('--name')?.trim() || email.split('@')[0]! };
}
