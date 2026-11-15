// PLAT-001 — health endpoint.
import type { HealthResponse } from '@pilates/contracts';
import type { FastifyInstance } from 'fastify';

export function registerHealth(app: FastifyInstance): void {
  app.get('/api/health', async (): Promise<HealthResponse> => ({ status: 'ok' }));
}
