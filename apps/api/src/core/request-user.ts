// The authenticated user is attached by auth's guards (see requirements/auth/interface.md).
// Declared here, in core, so every module gets the type without importing auth.
import type { User } from '@pilates/contracts';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export type AuthUser = User;
