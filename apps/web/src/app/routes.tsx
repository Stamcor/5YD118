// PLAT-009 — routes are discovered from src/features/*/routes.tsx. Adding a feature needs
// no edit here, so features can be developed (and sparse-checked-out) independently.
import { applyGuard, collectFeatureRoutes, type FeatureRoutes } from '@pilates/web-kit';
import type { RouteObject } from 'react-router';
import { Navigate } from 'react-router';
import { Layout } from './Layout.js';
import { RequireAuth } from './RequireAuth.js';

const features = import.meta.glob<FeatureRoutes>('../features/*/routes.tsx', { eager: true });

export function buildRoutes(): RouteObject[] {
  const { routes, nav } = collectFeatureRoutes(features);
  return [
    {
      element: <Layout nav={nav} />,
      children: [
        ...applyGuard(routes, (_route, element) => <RequireAuth>{element}</RequireAuth>),
        { path: '/', element: <Navigate to="/courses" replace /> },
        { path: '*', element: <p>Page not found.</p> },
      ],
    },
  ];
}
