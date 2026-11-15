import { describe, expect, it } from 'vitest';
import { ErrorResponseSchema, Money } from './common.js';

describe('common contract', () => {
  it('[PLAT-003/AC1] accepts the error envelope', () => {
    const parsed = ErrorResponseSchema.parse({
      error: { code: 'APPOINTMENT_FULL', message: 'No seats left' },
    });
    expect(parsed.error.code).toBe('APPOINTMENT_FULL');
  });

  it('[PLAT-003/AC1] rejects unknown error codes', () => {
    expect(() =>
      ErrorResponseSchema.parse({ error: { code: 'SOMETHING_ELSE', message: 'x' } }),
    ).toThrow();
  });

  it('money is integer minor units with a lower-case ISO currency', () => {
    expect(Money.safeParse({ amountCents: 2500, currency: 'eur' }).success).toBe(true);
    expect(Money.safeParse({ amountCents: 25.5, currency: 'eur' }).success).toBe(false);
    expect(Money.safeParse({ amountCents: 2500, currency: 'EUR' }).success).toBe(false);
  });
});
