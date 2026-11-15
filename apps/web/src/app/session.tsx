// Who is logged in. Loaded from GET /api/auth/me (AUTH-004); shared by guards and features.
import { UserResponse, type User } from '@pilates/contracts';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api.js';

export type Session =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: User };

interface SessionValue {
  session: Session;
  refresh(): Promise<void>;
  /** Set after login/register (user) or logout (null) without another request. */
  setUser(user: User | null): void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'loading', user: null });

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.get('/api/auth/me', UserResponse);
      setSession({ status: 'authenticated', user });
    } catch {
      setSession({ status: 'anonymous', user: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onUnauth = () => setSession({ status: 'anonymous', user: null });
    window.addEventListener('auth:unauthenticated', onUnauth);
    return () => window.removeEventListener('auth:unauthenticated', onUnauth);
  }, [refresh]);

  const setUser = useCallback((user: User | null) => {
    setSession(user ? { status: 'authenticated', user } : { status: 'anonymous', user: null });
  }, []);

  return (
    <SessionContext.Provider value={{ session, refresh, setUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
