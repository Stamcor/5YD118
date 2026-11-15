// Requirements: requirements/auth/spec.md (UI acceptance criteria)
import type { FeatureRoutes } from '@pilates/web-kit';
import { UNAUTHENTICATED, fakeFetch } from '@pilates/web-kit/testing';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRoutes } from '../../../app/routes.js';
import { routes as authRoutes } from '../routes.js';

const ann = {
  id: '0192f3a4-0000-7000-8000-000000000001',
  email: 'ann@example.com',
  name: 'Ann',
  role: 'member',
};

// The auth feature plus stand-ins for pages other features own.
const features: Record<string, FeatureRoutes> = {
  '../features/auth/routes.tsx': { routes: authRoutes },
  '../features/x/routes.tsx': {
    routes: [
      {
        path: '/courses',
        element: <h1>Courses page</h1>,
        requiresAuth: true,
        nav: { label: 'Courses', order: 1 },
      },
      { path: '/schedule', element: <h1>Schedule page</h1>, requiresAuth: true },
    ],
  },
};

function renderAt(path: string) {
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

/** Session API that flips to "logged in" once login/register succeeds. */
function sessionApi(extra: Parameters<typeof fakeFetch>[0] = {}) {
  let user: typeof ann | null = null;
  return fakeFetch({
    'GET /api/auth/me': () => (user ? { status: 200, body: { user } } : UNAUTHENTICATED),
    'POST /api/auth/login': () => ((user = ann), { status: 200, body: { user } }),
    'POST /api/auth/register': () => ((user = ann), { status: 201, body: { user } }),
    'POST /api/auth/logout': () => ((user = null), { status: 204 }),
    ...extra,
  });
}

const fill = async (label: RegExp, value: string) =>
  userEvent.type(screen.getByLabelText(label), value);

afterEach(() => vi.unstubAllGlobals());

describe('AUTH-002 — Login', () => {
  it('[AUTH-002/AC3] logging in sends the member to next', async () => {
    const api = sessionApi();
    const router = renderAt('/login?next=%2Fschedule');
    await fill(/email/i, 'ann@example.com');
    await fill(/password/i, 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByRole('heading', { name: 'Schedule page' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/schedule');
    expect(api.calls.find((c) => c.key === 'POST /api/auth/login')?.body).toEqual({
      email: 'ann@example.com',
      password: 'correct horse battery',
    });
  });

  it('[AUTH-002/AC3] without next, or with an external next, the member goes to /courses', async () => {
    sessionApi();
    const router = renderAt('/login?next=%2F%2Fevil.example');
    await fill(/email/i, 'ann@example.com');
    await fill(/password/i, 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    await screen.findByRole('heading', { name: 'Courses page' });
    expect(router.state.location.pathname).toBe('/courses');
  });

  it('[AUTH-002/AC2] wrong credentials show an error and keep the member on the page', async () => {
    sessionApi({
      'POST /api/auth/login': {
        status: 401,
        body: { error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' } },
      },
    });
    renderAt('/login');
    await fill(/email/i, 'ann@example.com');
    await fill(/password/i, 'wrong password!!');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });
});

describe('AUTH-001 — Member registration', () => {
  it('[AUTH-001/AC5] registering logs the member in and sends them to next or /courses', async () => {
    const api = sessionApi();
    const router = renderAt('/register?next=%2Fschedule');
    await fill(/name/i, 'Ann');
    await fill(/email/i, 'ann@example.com');
    await fill(/password/i, 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await screen.findByRole('heading', { name: 'Schedule page' });
    expect(router.state.location.pathname).toBe('/schedule');
    expect(api.calls.find((c) => c.key === 'POST /api/auth/register')?.body).toEqual({
      name: 'Ann',
      email: 'ann@example.com',
      password: 'correct horse battery',
    });
  });

  it('[AUTH-001/AC5] an existing email shows a hint with a link to log in', async () => {
    sessionApi({
      'POST /api/auth/register': {
        status: 409,
        body: {
          error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' },
        },
      },
    });
    renderAt('/register');
    await fill(/name/i, 'Ann');
    await fill(/email/i, 'ann@example.com');
    await fill(/password/i, 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/);
    expect(screen.getAllByRole('link', { name: /log in/i }).length).toBeGreaterThan(0);
  });

  it('[AUTH-001/AC3] a short password is rejected before anything is sent', async () => {
    const api = sessionApi();
    renderAt('/register');
    await fill(/name/i, 'Ann');
    await fill(/email/i, 'ann@example.com');
    await fill(/password/i, 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 12 characters/);
    expect(api.calls.some((c) => c.key === 'POST /api/auth/register')).toBe(false);
  });
});

describe('AUTH-003 — Logout', () => {
  it('[AUTH-003/AC1] "Log out" ends the session and returns to the login page', async () => {
    const api = sessionApi();
    const router = renderAt('/login');
    await fill(/email/i, 'ann@example.com');
    await fill(/password/i, 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    await screen.findByRole('heading', { name: 'Courses page' });

    await userEvent.click(screen.getByRole('link', { name: /log out/i }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(api.calls.some((c) => c.key === 'POST /api/auth/logout')).toBe(true);
    expect(screen.queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument();
  });
});
