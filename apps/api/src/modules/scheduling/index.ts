// Module `scheduling`. Requirements: requirements/scheduling/spec.md
// Other modules may use only ./public.ts (types) and ./testing.ts (fakes).
import { defineModule } from '../../core/module.js';
import './public.js';

export default defineModule({
  name: 'scheduling',
  dependsOn: ['platform', 'auth', 'courses'],
  async register(_app, _ctx) {
    // TODO: implement requirements/scheduling/spec.md test-first (see __tests__/).
  },
});
