import { defineConfig } from 'drizzle-kit';

// Each module owns its tables in src/modules/<module>/schema.ts (PLAT-006).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/*/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
