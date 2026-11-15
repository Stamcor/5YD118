// Feature `auth` of the member app. Requirements: requirements/auth/spec.md (AUTH-001, AUTH-002, AUTH-003)
// Pages are placeholders. Implement them test-first (see __tests__/).
import type { AppRoute } from '@pilates/web-kit';

// TODO(AUTH-002)
function LoginPage() {
  return <h1>Log in</h1>;
}

// TODO(AUTH-001)
function RegisterPage() {
  return <h1>Create an account</h1>;
}

export const routes: AppRoute[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
];
