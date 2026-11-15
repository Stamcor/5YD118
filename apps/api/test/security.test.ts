// Requirements: requirements/platform/spec.md (PLAT-004, PLAT-005, PLAT-008)
import { Writable } from 'node:stream';
import { PublicConfigResponse } from '@pilates/contracts';
import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { loggerOptions } from '../src/core/logging.js';
import { TEST_ENV, buildTestApp, testConfig, type TestApp } from './helpers.js';

let t: TestApp | undefined;
afterEach(async () => {
  await t?.close();
  t = undefined;
});

function captureLogs() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      for (const l of String(chunk).split('\n').filter(Boolean)) lines.push(JSON.parse(l));
      cb();
    },
  });
  return { lines, stream };
}

describe('PLAT-005 — Browser security: CORS, CSRF and headers', () => {
  it('[PLAT-005/AC1] CORS allows only WEB_ORIGIN and ADMIN_ORIGIN, with credentials', async () => {
    t = await buildTestApp({ modules: [] });
    for (const origin of [TEST_ENV.WEB_ORIGIN, TEST_ENV.ADMIN_ORIGIN]) {
      const res = await t.app.inject({
        method: 'OPTIONS',
        url: '/api/health',
        headers: { origin, 'access-control-request-method': 'POST' },
      });
      expect(res.headers['access-control-allow-origin']).toBe(origin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    }
    const evil = await t.app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('[PLAT-005/AC2] state-changing requests without an allowed Origin → 403 CSRF_REJECTED', async () => {
    t = await buildTestApp({ modules: [] });
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
      for (const headers of [{}, { origin: 'https://evil.example' }]) {
        const res = await t.app.inject({ method, url: '/api/anything', headers, payload: {} });
        expect(res.statusCode, `${method} ${JSON.stringify(headers)}`).toBe(403);
        expect(res.json().error.code).toBe('CSRF_REJECTED');
      }
    }
    // allowed origins pass the check (and then hit the 404 of the unknown route)
    for (const origin of [TEST_ENV.WEB_ORIGIN, TEST_ENV.ADMIN_ORIGIN]) {
      const ok = await t.app.inject({
        method: 'POST',
        url: '/api/anything',
        headers: { origin },
        payload: {},
      });
      expect(ok.statusCode).toBe(404);
    }
    // GET is never blocked
    expect((await t.app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200);
  });

  it('[PLAT-005/AC2] the Stripe webhook is exempt from the origin check', async () => {
    t = await buildTestApp({ modules: [] });
    const res = await t.app.inject({ method: 'POST', url: '/api/payments/webhook', payload: {} });
    expect(res.statusCode).not.toBe(403);
  });

  it('[PLAT-005/AC3] security headers are set', async () => {
    t = await buildTestApp({ modules: [] });
    const res = await t.app.inject({ method: 'GET', url: '/api/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });
});

describe('PLAT-004 — Structured, privacy-safe logging', () => {
  it('[PLAT-004/AC1] JSON request logs with request id, method, route, status, duration', async () => {
    const { lines, stream } = captureLogs();
    t = await buildTestApp({ modules: [], logStream: stream });
    const res = await t.app.inject({ method: 'GET', url: '/api/health' });
    const id = res.headers['x-request-id'];
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const done = lines.find((l) => l.msg === 'request completed');
    expect(done).toMatchObject({ reqId: id, res: { statusCode: 200 } });
    expect(typeof done?.responseTime).toBe('number');
    const incoming = lines.find((l) => l.msg === 'incoming request');
    expect(incoming).toMatchObject({ reqId: id, req: { method: 'GET', route: '/api/health' } });
  });

  it('[PLAT-004/AC1] a well-formed incoming x-request-id is kept, a malformed one replaced', async () => {
    t = await buildTestApp({ modules: [] });
    const kept = await t.app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { 'x-request-id': 'abc-123' },
    });
    expect(kept.headers['x-request-id']).toBe('abc-123');
    const bad = await t.app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { 'x-request-id': 'a\nb' },
    });
    expect(bad.headers['x-request-id']).not.toContain('\n');
  });

  it('[PLAT-004/AC2] secrets are redacted and headers are not logged', async () => {
    const { lines, stream } = captureLogs();
    const app = Fastify({ logger: loggerOptions(testConfig(), stream) });
    app.post('/login', async (req) => {
      req.log.info(
        { body: { email: 'a@b.c', password: 'hunter2hunter2' }, sessionId: 's3cr3t' },
        'attempt',
      );
      req.log.info({ stripe: { secretKey: 'sk_test_abc' }, authorization: 'Bearer x' }, 'stripe');
      return {};
    });
    await app.inject({
      method: 'POST',
      url: '/login',
      headers: { cookie: 'sid=s3cr3t', authorization: 'Bearer tok' },
      payload: {},
    });
    const all = JSON.stringify(lines);
    for (const secret of ['hunter2hunter2', 's3cr3t', 'sk_test_abc', 'Bearer'])
      expect(all, secret).not.toContain(secret);
    expect(all).toContain('[REDACTED]');
    await app.close();
  });
});

describe('PLAT-008 — Public client configuration', () => {
  it('[PLAT-008/AC1] GET /api/config/public returns the public settings only, without login', async () => {
    t = await buildTestApp({ modules: [] });
    const res = await t.app.inject({ method: 'GET', url: '/api/config/public' });
    expect(res.statusCode).toBe(200);
    expect(PublicConfigResponse.strict().parse(res.json())).toEqual({
      studioTimezone: 'Europe/Berlin',
      currency: 'eur',
      bookingHoldMinutes: 30,
      cancellationDeadlineHours: 24,
    });
  });
});
