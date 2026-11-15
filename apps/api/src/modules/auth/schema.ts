// Tables owned by module `auth` (PLAT-006). Prefix: auth_
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const authUsers = pgTable('auth_users', {
  id: uuid('id').primaryKey(),
  /** Stored trimmed and lower-cased (AUTH-001/AC2). */
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['member', 'admin'] })
    .notNull()
    .default('member'),
  /** argon2id (AUTH-001/AC4). */
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const authSessions = pgTable(
  'auth_sessions',
  {
    /** HMAC-SHA256(SESSION_SECRET, session id): the raw id only ever lives in the cookie. */
    idHash: text('id_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('auth_sessions_user_id_idx').on(t.userId)],
);
