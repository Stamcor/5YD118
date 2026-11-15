// Public surface of module `auth`. See requirements/auth/interface.md.
// Rule: this file may import only from core and @pilates/contracts.
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthUser } from '../../core/request-user.js';

export type { AuthUser };

/** Fastify preHandler that sets `request.user` or throws 401/403 AppError. */
export type Guard = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export interface AuthGuards {
  requireUser: Guard;
  requireAdmin: Guard;
}

export interface UserDirectory {
  findById(id: string): Promise<AuthUser | null>;
  findManyByIds(ids: string[]): Promise<AuthUser[]>;
}

declare module '../../core/registry.js' {
  interface ServiceMap {
    'auth.guards': AuthGuards;
    'auth.users': UserDirectory;
  }
}
