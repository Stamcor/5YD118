// Owned by module `scheduling`. See requirements/scheduling/spec.md.
import { z } from 'zod';
import { Id, Money, Timestamp, listOf } from './common.js';

export const AppointmentStatus = z.enum(['scheduled', 'cancelled']);
export type AppointmentStatus = z.infer<typeof AppointmentStatus>;

/** Member view — SCHED-006, SCHED-007 */
export const Appointment = z.object({
  id: Id,
  courseId: Id,
  courseTitle: z.string(),
  startsAt: Timestamp,
  endsAt: Timestamp,
  location: z.string(),
  instructor: z.string().nullable(),
  price: Money,
  seatsLeft: z.number().int().nonnegative(),
  isBookable: z.boolean(),
  status: AppointmentStatus,
});
export type Appointment = z.infer<typeof Appointment>;

/** Admin view — SCHED-005 */
export const AdminAppointment = Appointment.extend({
  capacity: z.number().int(),
  seatsTaken: z.number().int().nonnegative(),
  seriesId: Id.nullable(),
  cancelReason: z.string().nullable(),
});
export type AdminAppointment = z.infer<typeof AdminAppointment>;

/** POST /api/admin/appointments — SCHED-001 */
export const CreateAppointmentRequest = z.strictObject({
  courseId: Id,
  startsAt: Timestamp,
  location: z.string().trim().min(1).max(120),
  instructor: z.string().trim().max(120).optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  priceCents: z.number().int().min(50).optional(),
});
export type CreateAppointmentRequest = z.infer<typeof CreateAppointmentRequest>;

const LocalDate = z.iso.date(); // YYYY-MM-DD in studio timezone
const LocalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:mm');

/** POST /api/admin/appointments/series — SCHED-002 */
export const CreateSeriesRequest = z.strictObject({
  courseId: Id,
  time: LocalTime,
  weekdays: z.array(z.number().int().min(1).max(7)).min(1), // ISO weekday, 1 = Monday
  fromDate: LocalDate,
  toDate: LocalDate,
  location: z.string().trim().min(1).max(120),
  instructor: z.string().trim().max(120).optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  priceCents: z.number().int().min(50).optional(),
});
export type CreateSeriesRequest = z.infer<typeof CreateSeriesRequest>;

export const SeriesPreviewResponse = z.object({ startsAt: z.array(Timestamp) });

/** PATCH /api/admin/appointments/:id — SCHED-003 */
export const UpdateAppointmentRequest = z.strictObject({
  startsAt: Timestamp.optional(),
  location: z.string().trim().min(1).max(120).optional(),
  instructor: z.string().trim().max(120).nullable().optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  priceCents: z.number().int().min(50).optional(),
});
export type UpdateAppointmentRequest = z.infer<typeof UpdateAppointmentRequest>;

/** POST /api/admin/appointments/:id/cancel — SCHED-004 */
export const CancelAppointmentRequest = z.strictObject({
  reason: z.string().trim().max(500).optional(),
});

export const AppointmentQuery = z.object({
  courseId: Id.optional(),
  from: Timestamp.optional(),
  to: Timestamp.optional(),
});

export const AdminAppointmentQuery = AppointmentQuery.extend({
  status: AppointmentStatus.optional(),
});

export const AppointmentListResponse = listOf(Appointment);
export type AppointmentListResponse = z.infer<typeof AppointmentListResponse>;

export const AdminAppointmentListResponse = listOf(AdminAppointment);
export type AdminAppointmentListResponse = z.infer<typeof AdminAppointmentListResponse>;
