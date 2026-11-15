// AUTH-001 — member registration.
import { RegisterRequest, UserResponse } from '@pilates/contracts';
import { ApiError, safeNext } from '@pilates/web-kit';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useSession } from '../../app/session.js';
import { api } from '../../lib/api.js';

export function RegisterPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'), '/courses');
  const navigate = useNavigate();
  const { session, setUser } = useSession();
  const [error, setError] = useState<ReactNode>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.status === 'authenticated') navigate(next, { replace: true });
  }, [session.status, next, navigate]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input = RegisterRequest.safeParse({
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
    });
    if (!input.success) {
      const field = input.error.issues[0]?.path[0];
      return setError(
        field === 'password'
          ? 'Your password must be at least 12 characters long.'
          : field === 'email'
            ? 'Please enter a valid email address.'
            : 'Please enter your name.',
      );
    }
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.post('/api/auth/register', input.data, UserResponse);
      setUser(user);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        setError(
          <>
            An account with this email already exists.{' '}
            <Link to={`/login?next=${encodeURIComponent(next)}`}>Log in instead</Link>
          </>,
        );
      } else {
        setError(
          err instanceof ApiError && err.status < 500
            ? err.message
            : 'Registration failed. Please try again.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Create an account</h1>
      <form className="stack" onSubmit={onSubmit} noValidate>
        {error && <p role="alert">{error}</p>}
        <label>
          Name
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
          <span className="hint">At least 12 characters.</span>
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="hint">
          Already registered? <Link to={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
        </p>
      </form>
    </>
  );
}
