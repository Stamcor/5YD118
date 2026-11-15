// PLAT-009/AC4 — one fetch wrapper for both frontends. Responses are parsed with the zod
// schemas from @pilates/contracts, so a contract drift fails loudly instead of rendering junk.
import { ErrorResponseSchema, type ErrorCode } from '@pilates/contracts';
import type { z } from 'zod';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'NETWORK_ERROR' | 'BAD_RESPONSE',
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  /** Called on any 401 (e.g. redirect to login). */
  onUnauthenticated?: () => void;
  fetch?: typeof fetch;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export function createApiClient(opts: ApiClientOptions = {}) {
  const base = opts.baseUrl ?? '';
  const doFetch = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));

  async function request<S extends z.ZodType>(
    method: Method,
    path: string,
    schema: S | null,
    body?: unknown,
  ): Promise<z.infer<S>> {
    let res: Response;
    try {
      res = await doFetch(base + path, {
        method,
        credentials: 'include',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      throw new ApiError(0, 'NETWORK_ERROR', (err as Error).message);
    }
    const text = await res.text();
    const json: unknown = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      if (res.status === 401) opts.onUnauthenticated?.();
      const parsed = ErrorResponseSchema.safeParse(json);
      if (parsed.success) {
        const { code, message, details } = parsed.data.error;
        throw new ApiError(res.status, code, message, details);
      }
      throw new ApiError(res.status, 'BAD_RESPONSE', `HTTP ${res.status}`);
    }
    if (!schema) return undefined as z.infer<S>;
    const parsed = schema.safeParse(json);
    if (!parsed.success)
      throw new ApiError(res.status, 'BAD_RESPONSE', 'Response does not match contract');
    return parsed.data;
  }

  return {
    get: <S extends z.ZodType>(path: string, schema: S) => request('GET', path, schema),
    post: <S extends z.ZodType>(path: string, body: unknown, schema: S | null) =>
      request('POST', path, schema, body),
    patch: <S extends z.ZodType>(path: string, body: unknown, schema: S | null) =>
      request('PATCH', path, schema, body),
    delete: (path: string) => request('DELETE', path, null),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
