// Fixture for PLAT-006 tests: a tiny schema with one committed migration in ./migrations.
import { pgTable, text } from 'drizzle-orm/pg-core';

export const fixtureNotes = pgTable('fixture_notes', {
  id: text('id').primaryKey(),
  body: text('body').notNull(),
});
