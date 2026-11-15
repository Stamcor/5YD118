// Owned by module `auth`. See requirements/auth/spec.md.
import { z } from 'zod';
import { Id } from './common.js';

export const Role = z.enum(['member', 'admin']);
export type Role = z.infer<typeof Role>;

export const User = z.object({
  id: Id,
  email: z.email(),
  name: z.string(),
  role: Role,
});
export type User = z.infer<typeof User>;

const Email = z.string().trim().toLowerCase().pipe(z.email());

/** POST /api/auth/register — AUTH-001 (`role` is not accepted, AUTH-006) */
export const RegisterRequest = z.object({
  name: z.string().trim().min(1).max(120),
  email: Email,
  password: z.string().min(12).max(200),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

/** POST /api/auth/login — AUTH-002 */
export const LoginRequest = z.strictObject({
  email: Email,
  password: z.string().min(1).max(200),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

/** Response of register, login and GET /api/auth/me */
export const UserResponse = z.object({ user: User });
export type UserResponse = z.infer<typeof UserResponse>;
