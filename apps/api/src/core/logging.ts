// PLAT-004 — structured, privacy-safe logging (pino via Fastify).
import { randomUUID } from 'node:crypto';
import type { FastifyServerOptions } from 'fastify';
import type { Config } from './config.js';

/** Anything matching these paths is replaced by "[REDACTED]" in every log line. */
export const REDACT_PATHS = [
  'password',
  '*.password',
  '*.*.password',
  'sessionId',
  '*.sessionId',
  'sid',
  '*.sid',
  'cookie',
  '*.cookie',
  'authorization',
  '*.authorization',
  'secretKey',
  '*.secretKey',
  '*.*.secretKey',
  'stripeSignature',
  '*.stripeSignature',
  'req.headers',
  'res.headers',
];

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function loggerOptions(
  _config: Pick<Config, 'NODE_ENV'>,
  stream?: NodeJS.WritableStream,
): FastifyServerOptions['logger'] {
  return {
    level: 'info',
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    serializers: {
      // No headers, no body, no query values: only what is needed to trace a request.
      req: (req: { method: string; url: string; routeOptions?: { url?: string } }) => ({
        method: req.method,
        route: req.routeOptions?.url ?? 'unmatched',
        path: req.url.split('?')[0],
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
    ...(stream ? { stream } : {}),
  } as FastifyServerOptions['logger'];
}

/** Keep a well-formed incoming x-request-id (e.g. from nginx), otherwise generate one. */
export function genReqId(req: { headers: Record<string, string | string[] | undefined> }): string {
  const incoming = req.headers['x-request-id'];
  return typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}
