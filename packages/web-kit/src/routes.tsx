// PLAT-009 — features contribute routes; the shell assembles them.
import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';

export type AppRoute = RouteObject & {
  /** Redirect anonymous users to /login?next=… */
  requiresAuth?: boolean;
  /** Show in the main navigation. */
  nav?: { label: string; order: number };
};

/** What `src/features/<name>/routes.tsx` exports. */
export interface FeatureRoutes {
  routes: AppRoute[];
}

export interface NavItem {
  path: string;
  label: string;
  order: number;
}

// Collect routes from import.meta.glob('../features/<name>/routes.tsx', { eager: true }).
export function collectFeatureRoutes(modules: Record<string, FeatureRoutes>): {
  routes: AppRoute[];
  nav: NavItem[];
} {
  const routes = Object.keys(modules)
    .sort()
    .flatMap((k) => modules[k]?.routes ?? []);
  const nav = routes
    .filter(
      (r): r is AppRoute & { path: string; nav: NonNullable<AppRoute['nav']> } =>
        !!r.nav && !!r.path,
    )
    .map((r) => ({ path: r.path, label: r.nav.label, order: r.nav.order }))
    .sort((a, b) => a.order - b.order);
  return { routes, nav };
}

export type Guard = (route: AppRoute, element: ReactNode) => ReactNode;

/** Wrap each route's element with the guard (e.g. RequireAuth). */
export function applyGuard(routes: AppRoute[], guard: Guard): RouteObject[] {
  return routes.map(({ requiresAuth, nav: _nav, ...r }) => ({
    ...r,
    element: requiresAuth ? guard({ ...r, requiresAuth } as AppRoute, r.element) : r.element,
    children: r.children ? applyGuard(r.children as AppRoute[], guard) : undefined,
  })) as RouteObject[];
}
