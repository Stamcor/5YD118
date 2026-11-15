// Requirements: requirements/platform/spec.md (PLAT-009)
// Uses fixture features so the shell is testable in a sparse checkout without real features.
import type { FeatureRoutes } from '@pilates/web-kit';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRoutes, discoveredFeatures } from '../routes.js';

const fixtures: Record<string, FeatureRoutes> = {
  '../features/login/routes.tsx': { routes: [{ path: '/login', element: <h1>Log in</h1> }] },
  '../features/private/routes.tsx': {
    routes: [{ path: '/private', element: <h1>Private</h1>, requiresAuth: true }],
  },
};

const member = {
  id: '0192f3a4-0000-7000-8000-000000000001',
  email: 'm@example.test',
  name: 'M',
  role: 'member',
};

function mockMe(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}
const anonymous = () =>
  mockMe(401, { error: { code: 'UNAUTHENTICATED', message: 'Login required' } });

function renderAt(path: string, features = fixtures) {
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const paths = (routes: RouteObject[]): string[] =>
  routes.flatMap((r) => [...(r.path ? [r.path] : []), ...paths(r.children ?? [])]);

afterEach(() => vi.unstubAllGlobals());

describe('PLAT-009 — Frontend app shells (web)', () => {
  it('[PLAT-009/AC1] mounts every route of every feature found in src/features/*/routes.tsx', () => {
    const mounted = paths(buildRoutes());
    for (const feature of Object.values(discoveredFeatures))
      for (const r of feature.routes) expect(mounted).toContain(r.path);
  });

  it('[PLAT-009/AC2] redirects anonymous users to /login?next=…', async () => {
    anonymous();
    const router = renderAt('/private');
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=' + encodeURIComponent('/private'));
  });

  it('[PLAT-009/AC2] shows protected pages to logged-in members', async () => {
    mockMe(200, { user: member });
    renderAt('/private');
    expect(await screen.findByRole('heading', { name: 'Private' })).toBeInTheDocument();
  });

  it('redirects / to /courses', async () => {
    mockMe(200, { user: member });
    const router = renderAt('/');
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/courses'));
  });

  it.todo('[PLAT-009/AC3] the error boundary shows a friendly message with a retry action');
});
