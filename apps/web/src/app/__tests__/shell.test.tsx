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

afterEach(() => vi.unstubAllGlobals());

describe('PLAT-009 — Frontend app shells (web)', () => {
  it('[PLAT-009/AC1] discovers routes from src/features/*/routes.tsx', async () => {
    mockMe(401, { error: { code: 'UNAUTHENTICATED', message: 'Login required' } });
    renderAt('/login');
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  it('[PLAT-009/AC2] redirects anonymous users to /login?next=…', async () => {
    mockMe(401, { error: { code: 'UNAUTHENTICATED', message: 'Login required' } });
    const router = renderAt('/courses');
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=' + encodeURIComponent('/courses'));
  });

  it('[PLAT-009/AC2] shows protected pages to logged-in members', async () => {
    mockMe(200, { user: member });
    renderAt('/courses');
    expect(await screen.findByRole('heading', { name: 'Courses' })).toBeInTheDocument();
  });

  it.todo('[PLAT-009/AC3] the error boundary shows a friendly message with a retry action');
});
