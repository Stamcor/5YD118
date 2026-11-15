// Feature `courses` of the member app. Requirements: requirements/courses/spec.md (CRS-005, CRS-006)
// Pages are placeholders. Implement them test-first (see __tests__/).
import type { AppRoute } from '@pilates/web-kit';

// TODO(CRS-005)
function CourseListPage() {
  return <h1>Courses</h1>;
}

// TODO(CRS-006)
function CourseDetailPage() {
  return <h1>Course</h1>;
}

export const routes: AppRoute[] = [
  {
    path: '/courses',
    element: <CourseListPage />,
    requiresAuth: true,
    nav: { label: 'Courses', order: 10 },
  },
  { path: '/courses/:courseId', element: <CourseDetailPage />, requiresAuth: true },
];
