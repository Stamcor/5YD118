# Courses — interface

Import from `apps/api/src/modules/courses/public.ts`.

## Service `courses.catalog`

```ts
export interface CourseSummary {
  id: string;
  title: string;
  durationMinutes: number;
  defaultCapacity: number;
  defaultPriceCents: number;
  status: 'active' | 'archived';
}

export interface CourseCatalog {
  /** Returns the course or null if it does not exist (archived courses are returned). */
  getCourse(id: string): Promise<CourseSummary | null>;
  getCourses(ids: string[]): Promise<CourseSummary[]>;
}
```

Tests in other modules use `fakeCatalog([...courses])` from `courses/testing.ts`.

## Events

| Type              | Payload                | When                       |
| ----------------- | ---------------------- | -------------------------- |
| `course.archived` | `{ courseId: string }` | After a course is archived |

## HTTP contract

`packages/contracts/src/courses.ts`: `Course`, `CourseLevel`, `CreateCourseRequest`,
`UpdateCourseRequest`, `CourseListResponse`.

## Web routes owned

- Member app: `/courses`, `/courses/:courseId`. They link to `/schedule?courseId=…`,
  which scheduling owns.
- Admin portal: `/courses`, `/courses/new`, `/courses/:courseId`.
