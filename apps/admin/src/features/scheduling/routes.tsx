// Feature `scheduling` of the admin portal. Requirements: requirements/scheduling/spec.md (SCHED-001..SCHED-005)
// Pages are placeholders. Implement them test-first (see __tests__/).
import type { AppRoute } from '@pilates/web-kit';

// TODO(SCHED-005)
function AppointmentsPage() {
  return <h1>Appointments</h1>;
}

// TODO(SCHED-001)
function NewAppointmentPage() {
  return <h1>Add date</h1>;
}

// TODO(SCHED-002)
function NewSeriesPage() {
  return <h1>Add weekly series</h1>;
}

// TODO(SCHED-003)
function EditAppointmentPage() {
  return <h1>Edit appointment</h1>;
}

export const routes: AppRoute[] = [
  {
    path: '/appointments',
    element: <AppointmentsPage />,
    requiresAuth: true,
    nav: { label: 'Appointments', order: 10 },
  },
  { path: '/appointments/new', element: <NewAppointmentPage />, requiresAuth: true },
  { path: '/appointments/series/new', element: <NewSeriesPage />, requiresAuth: true },
  {
    path: '/appointments/:appointmentId/edit',
    element: <EditAppointmentPage />,
    requiresAuth: true,
  },
];
