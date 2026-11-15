// Public surface of module `courses`. See requirements/courses/interface.md.
export interface CourseSummary {
  id: string;
  title: string;
  durationMinutes: number;
  defaultCapacity: number;
  defaultPriceCents: number;
  status: 'active' | 'archived';
}

export interface CourseCatalog {
  getCourse(id: string): Promise<CourseSummary | null>;
  getCourses(ids: string[]): Promise<CourseSummary[]>;
}

declare module '../../core/registry.js' {
  interface ServiceMap {
    'courses.catalog': CourseCatalog;
  }
  interface EventMap {
    'course.archived': { courseId: string };
  }
}
