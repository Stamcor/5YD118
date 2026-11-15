// PLAT-005 — CORS, CSRF (origin check) and security headers.
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';
import type { Config } from './config.js';
import { AppError } from './errors.js';

/** Authenticated by its Stripe signature instead (PAY-002). */
export const CSRF_EXEMPT = new Set(['/api/payments/webhook']);
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function registerSecurity(app: FastifyInstance, config: Config): Promise<void> {
  const allowed = [config.WEB_ORIGIN, config.ADMIN_ORIGIN].map((o) => new URL(o).origin);

  await app.register(cors, { origin: allowed, credentials: true });
  await app.register(helmet, {
    // The API serves JSON only.
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

  app.addHook('onRequest', async (request) => {
    if (SAFE_METHODS.has(request.method)) return;
    if (CSRF_EXEMPT.has(request.url.split('?')[0]!)) return;
    const origin = request.headers.origin;
    if (!origin || !allowed.includes(origin)) {
      throw new AppError('CSRF_REJECTED', 403, 'Request origin not allowed');
    }
  });
}
