/** Inject time instead of calling `new Date()` in domain logic, so tests can move it. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
