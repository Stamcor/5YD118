// Feature `auth` of the member app. Requirements: requirements/auth/spec.md (AUTH-001, AUTH-002, AUTH-003)
import type { AppRoute } from '@pilates/web-kit';
import { LoginPage } from './LoginPage.js';
import { LogoutPage } from './LogoutPage.js';
import { RegisterPage } from './RegisterPage.js';

export const routes: AppRoute[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/logout', element: <LogoutPage /> },
];
