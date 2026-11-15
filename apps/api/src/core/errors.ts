// PLAT-003 — uniform error responses. Shape: requirements/_shared/api-conventions.md
import type { ErrorCode, ErrorResponse } from '@pilates/contracts';
import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly statusCode: number,
    message: string = code,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const body = (
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ErrorResponse => ({
  error: details ? { code, message, details } : { code, message },
});

export function zodIssues(err: ZodError) {
  return err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}

export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError | AppError | ZodError, request, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(body(err.code, err.message, err.details));
    }
    if (err instanceof ZodError) {
      return reply
        .status(400)
        .send(body('VALIDATION_ERROR', 'Request validation failed', { issues: zodIssues(err) }));
    }
    // Fastify's own client errors (malformed JSON, payload too large, …)
    if ('statusCode' in err && typeof err.statusCode === 'number' && err.statusCode < 500) {
      return reply.status(err.statusCode).send(body('VALIDATION_ERROR', err.message));
    }
    request.log.error({ err }, 'unhandled error');
    return reply.status(500).send(body('INTERNAL', 'Something went wrong'));
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(body('NOT_FOUND', `Route ${request.method} ${request.url} not found`));
  });
}
