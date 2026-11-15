// AUTH-008 — failed-login limiter per email. In memory: one API process per studio.
import type { Clock } from '../../core/clock.js';

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export class LoginRateLimiter {
  private readonly failures = new Map<string, number[]>();

  constructor(private readonly clock: Clock) {}

  private recent(email: string): number[] {
    const cutoff = this.clock.now().getTime() - WINDOW_MS;
    const list = (this.failures.get(email) ?? []).filter((t) => t > cutoff);
    if (list.length) this.failures.set(email, list);
    else this.failures.delete(email);
    return list;
  }

  isBlocked(email: string): boolean {
    return this.recent(email).length >= MAX_FAILURES;
  }

  recordFailure(email: string): void {
    this.failures.set(email, [...this.recent(email), this.clock.now().getTime()]);
  }

  reset(email: string): void {
    this.failures.delete(email);
  }
}
