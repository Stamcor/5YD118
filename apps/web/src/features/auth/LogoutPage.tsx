// AUTH-003 — logout ends the session server-side, then returns to the login page.
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from '../../app/session.js';
import { api } from '../../lib/api.js';

export function LogoutPage() {
  const navigate = useNavigate();
  const { setUser } = useSession();
  useEffect(() => {
    void api
      .post('/api/auth/logout', {}, null)
      .catch(() => undefined)
      .finally(() => {
        setUser(null);
        navigate('/login', { replace: true });
      });
  }, [navigate, setUser]);
  return <p aria-busy="true">Logging out…</p>;
}
