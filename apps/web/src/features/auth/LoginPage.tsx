// AUTH-002 — member login.
import { LoginRequest, UserResponse } from '@pilates/contracts';
import { ApiError, safeNext } from '@pilates/web-kit';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useSession } from '../../app/session.js';
import { api } from '../../lib/api.js';

export function LoginPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'), '/courses');
  const navigate = useNavigate();
  const { session, setUser } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.status === 'authenticated') navigate(next, { replace: true });
  }, [session.status, next, navigate]);

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
      <h1>Log in</h1>
      <form className="stack" onSubmit={onSubmit} noValidate>
        {error && <p role="alert">{error}</p>}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="hint">
          New here? <Link to={`/register?next=${encodeURIComponent(next)}`}>Create an account</Link>
        </p>
      </form>
    </>
  );
}
