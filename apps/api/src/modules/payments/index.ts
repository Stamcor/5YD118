// Module `payments`. Requirements: requirements/payments/spec.md
// Other modules may use only ./public.ts (types) and ./testing.ts (fakes).
import { defineModule } from '../../core/module.js';
import './public.js';

export default defineModule({
  name: 'payments',
  dependsOn: ['platform'],
  async register(_app, _ctx) {
    // TODO: implement requirements/payments/spec.md test-first (see __tests__/).
  },
});
