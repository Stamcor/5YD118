// PLAT-002 — configuration is validated at startup.
import { z } from 'zod';

const ConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((v) => /^(postgres(ql)?:\/\/|pglite:)/.test(v), 'must be postgres://… or pglite:…'),
    SESSION_SECRET: z.string().min(32),
    WEB_ORIGIN: z.url(),
    ADMIN_ORIGIN: z.url(),
    STUDIO_TIMEZONE: z
      .string()
      .default('Europe/Berlin')
      .refine(isValidTimeZone, 'must be an IANA timezone'),
    STUDIO_CURRENCY: z
      .string()
      .regex(/^[a-z]{3}$/)
      .default('eur'),
    BOOKING_HOLD_MINUTES: z.coerce
      .number()
      .int()
      .min(30, 'must be >= 30 (Stripe Checkout minimum)')
      .max(24 * 60)
      .default(30),
    BOOKING_CUTOFF_MINUTES: z.coerce.number().int().min(0).default(60),
    CANCELLATION_DEADLINE_HOURS: z.coerce.number().int().min(0).default(24),
    DB_MIGRATE_ON_START: z.stringbool().default(true),
    STRIPE_SECRET_KEY: z.string().regex(/^(sk|rk)_(test|live)_/, 'must be a Stripe secret key'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  })
  .superRefine((c, ctx) => {
    if (c.NODE_ENV === 'production' && /^(sk|rk)_test_/.test(c.STRIPE_SECRET_KEY)) {
      ctx.addIssue({
        code: 'custom',
        path: ['STRIPE_SECRET_KEY'],
        message: 'test-mode key not allowed in production',
      });
    }
  });

export type Config = z.infer<typeof ConfigSchema>;

export class ConfigError extends Error {
  constructor(
    readonly invalidKeys: string[],
    details: string[],
  ) {
    super(`Invalid configuration:\n${details.map((d) => `  - ${d}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Parse and validate the environment. Never echoes values (they may be secrets). */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (result.success) return result.data;
  const keys = [...new Set(result.error.issues.map((i) => String(i.path[0])))];
  const details = result.error.issues.map(
    (i) =>
      `${String(i.path[0])}: ${i.code === 'invalid_type' ? 'missing or wrong type' : i.message}`,
  );
  throw new ConfigError(keys, details);
}
