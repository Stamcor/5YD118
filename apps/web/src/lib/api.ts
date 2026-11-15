// Shared API client of this app (PLAT-009/AC4). Features import it from '../../lib/api.js'.
import { createApiClient } from '@pilates/web-kit';

export const api = createApiClient({
  onUnauthenticated: () => window.dispatchEvent(new Event('auth:unauthenticated')),
});
