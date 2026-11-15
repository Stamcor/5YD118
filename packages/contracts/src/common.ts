// Shared building blocks of the HTTP contract. Owned by module `platform`.
// See requirements/_shared/api-conventions.md.
import { z } from 'zod';

export const Id = z.uuid();
export type Id = z.infer<typeof Id>;

/** ISO-8601 UTC timestamp on the wire. */
export const Timestamp = z.iso.datetime({ offset: false });
export type Timestamp = z.infer<typeof Timestamp>;

export const Currency = z.string().regex(/^[a-z]{3}$/, 'ISO 4217 code, lower case');

export const Money = z.object({
  amountCents: z.number().int().nonnegative(),
  currency: Currency,
});
export type Money = z.infer<typeof Money>;

/** Every error code the API may return. Modules add theirs here (and in their interface.md). */
export const ErrorCode = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'CSRF_REJECTED',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'APPOINTMENT_FULL',
  'ALREADY_BOOKED',
  'CANCELLATION_CLOSED',
  'INVALID_STATE',
  'CAPACITY_BELOW_BOOKED',
  'APPOINTMENT_NOT_BOOKABLE',
  'COURSE_NOT_SCHEDULABLE',
  'RATE_LIMITED',
  'INTERNAL',
  'PAYMENT_PROVIDER_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const listOf = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });
