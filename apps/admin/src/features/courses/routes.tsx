// Feature `courses` of the admin portal. Requirements: requirements/courses/spec.md (CRS-001..CRS-004)
// Pages are placeholders. Implement them test-first (see __tests__/).
import type { AppRoute } from '@pilates/web-kit';

// TODO(CRS-004)
function CourseListPage() {
  return <h1>Courses</h1>;
}

// TODO(CRS-001)
function NewCoursePage() {
  return <h1>New course</h1>;
}

// TODO(CRS-002)
function EditCoursePage() {
  return <h1>Edit course</h1>;
}

export const routes: AppRoute[] = [
  {
    path: '/courses',
    element: <CourseListPage />,
    requiresAuth: true,
    nav: { label: 'Courses', order: 20 },
  },
  { path: '/courses/new', element: <NewCoursePage />, requiresAuth: true },
  { path: '/courses/:courseId', element: <EditCoursePage />, requiresAuth: true },
];
