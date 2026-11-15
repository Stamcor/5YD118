import type { z } from 'zod';

/**
 * Validate untrusted input with a schema from @pilates/contracts.
 * Throws ZodError, which the error handler turns into 400 VALIDATION_ERROR (PLAT-003).
 */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}
