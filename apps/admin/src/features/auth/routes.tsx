// Feature `auth` of the admin portal. Requirements: requirements/auth/spec.md (AUTH-009)
import type { AppRoute } from '@pilates/web-kit';
import { AdminLoginPage } from './AdminLoginPage.js';
import { LogoutPage } from './LogoutPage.js';

export const routes: AppRoute[] = [
  { path: '/login', element: <AdminLoginPage /> },
  { path: '/logout', element: <LogoutPage /> },
];
