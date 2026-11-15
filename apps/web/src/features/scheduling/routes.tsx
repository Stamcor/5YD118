// Feature `scheduling` of the member app. Requirements: requirements/scheduling/spec.md (SCHED-006)
// Pages are placeholders. Implement them test-first (see __tests__/).
import type { AppRoute } from '@pilates/web-kit';

// TODO(SCHED-006)
function SchedulePage() {
  return <h1>Schedule</h1>;
}

export const routes: AppRoute[] = [
  {
    path: '/schedule',
    element: <SchedulePage />,
    requiresAuth: true,
    nav: { label: 'Schedule', order: 20 },
  },
];
