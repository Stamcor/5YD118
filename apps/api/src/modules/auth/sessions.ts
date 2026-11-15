// Server-side sessions (ADR 0005, AUTH-003, AUTH-007).
import { createHmac, randomBytes } from 'node:crypto';
import type { User } from '@pilates/contracts';
import { eq } from 'drizzle-orm';
import type { Clock } from '../../core/clock.js';
import type { Db } from '../../core/db.js';
import { authSessions, authUsers } from './schema.js';

const DAY = 24 * 60 * 60 * 1000;
export const MEMBER_IDLE_MS = 14 * DAY; // sliding
export const ADMIN_ABSOLUTE_MS = 12 * 60 * 60 * 1000; // from login
/** Avoid a write on every request: extend a member session at most once a minute. */
const TOUCH_INTERVAL_MS = 60 * 1000;

export interface ResolvedSession {
  user: User;
  expiresAt: Date;
  /** True when the expiry moved: the cookie should be re-issued. */
  extended: boolean;
}

export class SessionStore {
  constructor(
    private readonly db: Db,
    private readonly clock: Clock,
    private readonly secret: string,
  ) {}

  private hash(sid: string): string {
    return createHmac('sha256', this.secret).update(sid).digest('base64url');
  }

  async create(user: User): Promise<{ sid: string; expiresAt: Date }> {
    const now = this.clock.now();
    const sid = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      now.getTime() + (user.role === 'admin' ? ADMIN_ABSOLUTE_MS : MEMBER_IDLE_MS),
    );
    await this.db.insert(authSessions).values({
      idHash: this.hash(sid),
      userId: user.id,
      createdAt: now,
      lastSeenAt: now,
      expiresAt,
    });
    return { sid, expiresAt };
  }

  async resolve(sid: string): Promise<ResolvedSession | null> {
    const idHash = this.hash(sid);
    const [row] = await this.db
      .select({
        session: authSessions,
        user: {
          id: authUsers.id,
          email: authUsers.email,
          name: authUsers.name,
          role: authUsers.role,
        },
      })
      .from(authSessions)
      .innerJoin(authUsers, eq(authUsers.id, authSessions.userId))
      .where(eq(authSessions.idHash, idHash));
    if (!row) return null;

    const now = this.clock.now();
    if (row.session.expiresAt.getTime() <= now.getTime()) {
      await this.db.delete(authSessions).where(eq(authSessions.idHash, idHash));
      return null;
    }
    if (
      row.user.role === 'member' &&
      now.getTime() - row.session.lastSeenAt.getTime() >= TOUCH_INTERVAL_MS
    ) {
      const expiresAt = new Date(now.getTime() + MEMBER_IDLE_MS);
      await this.db
        .update(authSessions)
        .set({ lastSeenAt: now, expiresAt })
        .where(eq(authSessions.idHash, idHash));
      return { user: row.user, expiresAt, extended: true };
    }
    return { user: row.user, expiresAt: row.session.expiresAt, extended: false };
  }

  async destroy(sid: string): Promise<void> {
    await this.db.delete(authSessions).where(eq(authSessions.idHash, this.hash(sid)));
  }
}
