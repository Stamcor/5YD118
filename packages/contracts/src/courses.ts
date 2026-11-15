// Owned by module `courses`. See requirements/courses/spec.md.
import { z } from 'zod';
import { Id, Money, Timestamp, listOf } from './common.js';

export const CourseLevel = z.enum(['beginner', 'intermediate', 'advanced', 'all']);
export type CourseLevel = z.infer<typeof CourseLevel>;

export const CourseStatus = z.enum(['active', 'archived']);
export type CourseStatus = z.infer<typeof CourseStatus>;

/** Member view — CRS-005, CRS-006 */
export const Course = z.object({
  id: Id,
  title: z.string(),
  description: z.string(),
  level: CourseLevel,
  durationMinutes: z.number().int(),
  defaultPrice: Money,
});
export type Course = z.infer<typeof Course>;

/** Admin view — CRS-001..004 */
export const AdminCourse = Course.extend({
  defaultCapacity: z.number().int(),
  status: CourseStatus,
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
export type AdminCourse = z.infer<typeof AdminCourse>;

/** POST /api/admin/courses — CRS-001 */
export const CreateCourseRequest = z.strictObject({
  title: z.string().trim().min(3).max(120),
  description: z.string().max(4000).default(''),
  level: CourseLevel,
  durationMinutes: z.number().int().min(15).max(240),
  defaultCapacity: z.number().int().min(1).max(100),
  defaultPriceCents: z.number().int().min(50),
});
export type CreateCourseRequest = z.infer<typeof CreateCourseRequest>;

/** PATCH /api/admin/courses/:id — CRS-002 */
export const UpdateCourseRequest = CreateCourseRequest.partial();
export type UpdateCourseRequest = z.infer<typeof UpdateCourseRequest>;

export const CourseListResponse = listOf(Course);
export type CourseListResponse = z.infer<typeof CourseListResponse>;

export const AdminCourseListResponse = listOf(AdminCourse);
export type AdminCourseListResponse = z.infer<typeof AdminCourseListResponse>;
