// Test helper for frontend tests: a scripted fetch keyed by "METHOD /path".
import { vi } from 'vitest';

export type FakeResponse = { status: number; body?: unknown };
export type Handler = FakeResponse | ((init: RequestInit | undefined) => FakeResponse);

export function fakeFetch(routes: Record<string, Handler>) {
  const calls: { key: string; body: unknown }[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    calls.push({ key, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const handler = routes[key];
    if (!handler)
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: key } }), {
        status: 404,
      });
    const { status, body } = typeof handler === 'function' ? handler(init) : handler;
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fn);
  return { calls, routes, fn };
}

export const UNAUTHENTICATED: FakeResponse = {
  status: 401,
  body: { error: { code: 'UNAUTHENTICATED', message: 'Please log in' } },
};
