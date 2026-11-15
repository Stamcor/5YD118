// Feature `auth` of the admin portal. Requirements: requirements/auth/spec.md (AUTH-009)
// Pages are placeholders. Implement them test-first (see __tests__/).
import type { AppRoute } from '@pilates/web-kit';

// TODO(AUTH-009)
function AdminLoginPage() {
  return <h1>Staff login</h1>;
}

export const routes: AppRoute[] = [{ path: '/login', element: <AdminLoginPage /> }];
