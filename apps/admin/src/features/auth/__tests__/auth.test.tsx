// Requirements: requirements/auth/spec.md (AUTH-009, admin portal)
import type { FeatureRoutes } from '@pilates/web-kit';
import { UNAUTHENTICATED, fakeFetch } from '@pilates/web-kit/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRoutes } from '../../../app/routes.js';
import { routes as authRoutes } from '../routes.js';

const base = { id: '0192f3a4-0000-7000-8000-000000000001', email: 'x@studio.test', name: 'X' };
const features: Record<string, FeatureRoutes> = {
  '../features/auth/routes.tsx': { routes: authRoutes },
  '../features/x/routes.tsx': {
    routes: [
      {
        path: '/appointments',
        element: <h1>Appointments page</h1>,
        requiresAuth: true,
        nav: { label: 'Appointments', order: 1 },
      },
    ],
  },
};

function renderAt(path: string) {
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

function api(role: 'member' | 'admin') {
  let user: (typeof base & { role: string }) | null = null;
  return fakeFetch({
    'GET /api/auth/me': () => (user ? { status: 200, body: { user } } : UNAUTHENTICATED),
    'POST /api/auth/login': () => ((user = { ...base, role }), { status: 200, body: { user } }),
  });
}

async function logIn() {
  await userEvent.type(screen.getByLabelText(/email/i), 'x@studio.test');
  await userEvent.type(screen.getByLabelText(/password/i), 'correct horse battery');
  await userEvent.click(screen.getByRole('button', { name: /log in/i }));
}

afterEach(() => vi.unstubAllGlobals());

describe('AUTH-009 — Admin portal login', () => {
  it('[AUTH-009/AC1] anonymous users only see the login page, without navigation', async () => {
    api('admin');
    const router = renderAt('/appointments');
    expect(await screen.findByRole('heading', { name: 'Staff login' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('[AUTH-009/AC1] an admin logs in and lands on the page they wanted', async () => {
    api('admin');
    const router = renderAt('/login?next=%2Fappointments');
    await logIn();
    expect(await screen.findByRole('heading', { name: 'Appointments page' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/appointments');
    expect(screen.getByRole('link', { name: 'Appointments' })).toBeInTheDocument();
  });

  it('[AUTH-009/AC2] a member who logs in is told the portal is for studio staff', async () => {
    api('member');
    renderAt('/login');
    await logIn();
    expect(await screen.findByRole('alert')).toHaveTextContent('This portal is for studio staff');
    expect(screen.queryByRole('heading', { name: 'Appointments page' })).not.toBeInTheDocument();
  });
});
