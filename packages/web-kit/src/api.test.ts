import { UserResponse } from '@pilates/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './api.js';

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('web-kit api client', () => {
  it('[PLAT-009/AC4] parses API errors into ApiError with the contract code', async () => {
    const api = createApiClient({
      fetch: () => json(409, { error: { code: 'APPOINTMENT_FULL', message: 'Full' } }),
    });
    await expect(api.post('/api/bookings', {}, null)).rejects.toMatchObject({
      status: 409,
      code: 'APPOINTMENT_FULL',
    });
  });

  it('[PLAT-009/AC4] calls onUnauthenticated on 401', async () => {
    const onUnauthenticated = vi.fn();
    const api = createApiClient({
      onUnauthenticated,
      fetch: () => json(401, { error: { code: 'UNAUTHENTICATED', message: 'Login' } }),
    });
    await expect(api.get('/api/auth/me', UserResponse)).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthenticated).toHaveBeenCalledOnce();
  });

  it('rejects responses that do not match the contract', async () => {
    const api = createApiClient({ fetch: () => json(200, { user: { id: 'nope' } }) });
    await expect(api.get('/api/auth/me', UserResponse)).rejects.toMatchObject({
      code: 'BAD_RESPONSE',
    });
  });
});
