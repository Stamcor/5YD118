import { describe, expect, it } from 'vitest';
import { CreateBookingRequest } from './booking.js';

describe('booking contract', () => {
  it('[BOOK-001/AC2] rejects a client-supplied price', () => {
    const result = CreateBookingRequest.safeParse({
      appointmentId: '0192f3a4-0000-7000-8000-000000000001',
      priceCents: 1,
    });
    expect(result.success).toBe(false);
  });
});
