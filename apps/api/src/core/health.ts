// PLAT-001 — health endpoint.
import type { HealthResponse, PublicConfigResponse } from '@pilates/contracts';
import type { Config } from './config.js';
import type { FastifyInstance } from 'fastify';

export function registerHealth(app: FastifyInstance): void {
  app.get('/api/health', async (): Promise<HealthResponse> => ({ status: 'ok' }));
}

// PLAT-008 — settings the frontends need. Nothing secret.
export function registerPublicConfig(app: FastifyInstance, config: Config): void {
  app.get('/api/config/public', async (): Promise<PublicConfigResponse> => ({
    studioTimezone: config.STUDIO_TIMEZONE,
    currency: config.STUDIO_CURRENCY,
    bookingHoldMinutes: config.BOOKING_HOLD_MINUTES,
    cancellationDeadlineHours: config.CANCELLATION_DEADLINE_HOURS,
  }));
}
