// Fakes of courses' services for OTHER modules' tests.
import { randomUUID } from 'node:crypto';
import type { CourseCatalog, CourseSummary } from './public.js';

export function testCourse(partial: Partial<CourseSummary> = {}): CourseSummary {
  return {
    id: randomUUID(),
    title: 'Mat Pilates – Beginner',
    durationMinutes: 55,
    defaultCapacity: 12,
    defaultPriceCents: 2500,
    status: 'active',
    ...partial,
  };
}

export function fakeCatalog(courses: CourseSummary[] = []): { 'courses.catalog': CourseCatalog } {
  const byId = new Map(courses.map((c) => [c.id, c]));
  return {
    'courses.catalog': {
      getCourse: async (id) => byId.get(id) ?? null,
      getCourses: async (ids) => ids.flatMap((id) => byId.get(id) ?? []),
    },
  };
}
