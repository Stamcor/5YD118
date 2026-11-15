// AUTH-009 — staff login for the admin portal.
import { LoginRequest, UserResponse } from '@pilates/contracts';
import { ApiError, safeNext } from '@pilates/web-kit';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useSession } from '../../app/session.js';
import { api } from '../../lib/api.js';

const NOT_STAFF = 'This portal is for studio staff. Members can book on the studio website.';

export function AdminLoginPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'), '/appointments');
  const navigate = useNavigate();
  const { session, setUser } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = session.status === 'authenticated' && session.user.role === 'admin';
  const isMember = session.status === 'authenticated' && session.user.role !== 'admin';
  useEffect(() => {
    if (isAdmin) navigate(next, { replace: true });
  }, [isAdmin, next, navigate]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = LoginRequest.safeParse({
      email: form.get('email'),
      password: form.get('password'),
    });
    if (!input.success) return setError('Please enter your email and password.');
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.post('/api/auth/login', input.data, UserResponse);
      setUser(user);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status < 500
          ? err.message
          : 'Login failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Staff login</h1>
      <form className="stack" onSubmit={onSubmit} noValidate>
        {(error || isMember) && <p role="alert">{error ?? NOT_STAFF}</p>}
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </>
  );
}
