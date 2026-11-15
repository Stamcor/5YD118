// Module `courses`. Requirements: requirements/courses/spec.md
// Other modules may use only ./public.ts (types) and ./testing.ts (fakes).
import { defineModule } from '../../core/module.js';
import './public.js';

export default defineModule({
  name: 'courses',
  dependsOn: ['platform', 'auth'],
  async register(_app, _ctx) {
    // TODO: implement requirements/courses/spec.md test-first (see __tests__/).
  },
});
