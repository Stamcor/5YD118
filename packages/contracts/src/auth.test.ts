import { describe, expect, it } from 'vitest';
import { RegisterRequest } from './auth.js';

describe('auth contract', () => {
  it('[AUTH-001/AC2] normalises email to trimmed lower case', () => {
    const r = RegisterRequest.parse({
      name: 'A',
      email: '  Ann@Example.COM ',
      password: 'x'.repeat(12),
    });
    expect(r.email).toBe('ann@example.com');
  });

  it('[AUTH-001/AC3] rejects passwords shorter than 12 characters', () => {
    const r = RegisterRequest.safeParse({ name: 'A', email: 'a@example.com', password: 'short' });
    expect(r.success).toBe(false);
  });

  it('[AUTH-006/AC1] ignores a role in the registration body', () => {
    const r = RegisterRequest.parse({
      name: 'A',
      email: 'a@example.com',
      password: 'x'.repeat(12),
      role: 'admin',
    });
    expect(r).not.toHaveProperty('role');
  });
});
