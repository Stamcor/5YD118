// Feature `booking` of the admin portal. Requirements: requirements/booking/spec.md (BOOK-011)
// Pages are placeholders. Implement them test-first (see __tests__/).
import type { AppRoute } from '@pilates/web-kit';

// TODO(BOOK-011)
function AttendeesPage() {
  return <h1>Attendees</h1>;
}

export const routes: AppRoute[] = [
  {
    path: '/appointments/:appointmentId/attendees',
    element: <AttendeesPage />,
    requiresAuth: true,
  },
];
