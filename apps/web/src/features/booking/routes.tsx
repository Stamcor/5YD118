// Feature `booking` of the member app. Requirements: requirements/booking/spec.md (BOOK-001, BOOK-006, BOOK-007, BOOK-008)
// Pages are placeholders. Implement them test-first (see __tests__/).
import type { AppRoute } from '@pilates/web-kit';

// TODO(BOOK-001)
function BookPage() {
  return <h1>Book & pay</h1>;
}

// TODO(BOOK-007)
function MyBookingsPage() {
  return <h1>My bookings</h1>;
}

// TODO(BOOK-006)
function BookingReturnPage() {
  return <h1>Your booking</h1>;
}

export const routes: AppRoute[] = [
  { path: '/book/:appointmentId', element: <BookPage />, requiresAuth: true },
  {
    path: '/bookings',
    element: <MyBookingsPage />,
    requiresAuth: true,
    nav: { label: 'My bookings', order: 30 },
  },
  { path: '/bookings/:bookingId/return', element: <BookingReturnPage />, requiresAuth: true },
];
