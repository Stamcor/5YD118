// PLAT-009/AC2 — route guard.
import type { Role } from '@pilates/contracts';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from './session.js';

export function RequireAuth({ children, role }: { children: ReactNode; role?: Role }) {
  const { session } = useSession();
  const location = useLocation();
  if (session.status === 'loading') return <p aria-busy="true">Loading…</p>;
  if (session.status === 'anonymous') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (role && session.user.role !== role) {
    return <p role="alert">This portal is for studio staff.</p>;
  }
  return <>{children}</>;
}
