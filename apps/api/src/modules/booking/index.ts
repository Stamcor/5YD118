// Module `booking`. Requirements: requirements/booking/spec.md
// Other modules may use only ./public.ts (types) and ./testing.ts (fakes).
import { defineModule } from '../../core/module.js';
import './public.js';

export default defineModule({
  name: 'booking',
  dependsOn: ['platform', 'auth', 'scheduling', 'payments'],
  async register(_app, _ctx) {
    // TODO: implement requirements/booking/spec.md test-first (see __tests__/).
  },
});
