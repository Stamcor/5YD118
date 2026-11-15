// Owned by module `platform`.
import { z } from 'zod';
import { Currency } from './common.js';

/** GET /api/health — PLAT-001 */
export const HealthResponse = z.object({ status: z.literal('ok') });
export type HealthResponse = z.infer<typeof HealthResponse>;

/** GET /api/config/public — PLAT-008 */
export const PublicConfigResponse = z.object({
  studioTimezone: z.string(),
  currency: Currency,
  bookingHoldMinutes: z.number().int(),
  cancellationDeadlineHours: z.number().int(),
});
export type PublicConfigResponse = z.infer<typeof PublicConfigResponse>;
