// Requirements: requirements/platform/spec.md (PLAT-009)
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRoutes } from '../routes.js';

function mockMe(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

function renderAt(path: string) {
  const router = createMemoryRouter(buildRoutes(), { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const member = {
  id: '0192f3a4-0000-7000-8000-000000000001',
  email: 'm@example.test',
  name: 'M',
  role: 'member',
};
const admin = { ...member, role: 'admin' };

afterEach(() => vi.unstubAllGlobals());

describe('PLAT-009 — Frontend app shells (admin)', () => {
  it('[PLAT-009/AC1] discovers routes from src/features/*/routes.tsx', async () => {
    mockMe(401, { error: { code: 'UNAUTHENTICATED', message: 'Login required' } });
    renderAt('/login');
    expect(await screen.findByRole('heading', { name: 'Staff login' })).toBeInTheDocument();
  });

  it('[PLAT-009/AC2] redirects anonymous users to /login?next=…', async () => {
    mockMe(401, { error: { code: 'UNAUTHENTICATED', message: 'Login required' } });
    const router = renderAt('/appointments');
    expect(await screen.findByRole('heading', { name: 'Staff login' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=' + encodeURIComponent('/appointments'));
  });

  it('[PLAT-009/AC2] shows protected pages to admins', async () => {
    mockMe(200, { user: admin });
    renderAt('/appointments');
    expect(await screen.findByRole('heading', { name: 'Appointments' })).toBeInTheDocument();
  });

  it('[PLAT-009/AC2] [AUTH-009/AC2] members are told the portal is for studio staff', async () => {
    mockMe(200, { user: member });
    renderAt('/appointments');
    expect(await screen.findByRole('alert')).toHaveTextContent('This portal is for studio staff');
  });

  it.todo('[PLAT-009/AC3] the error boundary shows a friendly message with a retry action');
});
