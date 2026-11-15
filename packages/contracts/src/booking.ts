// Owned by module `booking`. See requirements/booking/spec.md.
import { z } from 'zod';
import { Id, Money, Timestamp, listOf } from './common.js';
import { PaymentStatus, RefundStatus } from './payments.js';

export const BookingStatus = z.enum([
  'pending_payment',
  'confirmed',
  'expired',
  'cancelled',
  'cancelled_by_studio',
]);
export type BookingStatus = z.infer<typeof BookingStatus>;

export const Booking = z.object({
  id: Id,
  appointmentId: Id,
  status: BookingStatus,
  price: Money,
  holdExpiresAt: Timestamp.nullable(),
  confirmedAt: Timestamp.nullable(),
  cancelledAt: Timestamp.nullable(),
  canCancel: z.boolean(),
  appointment: z.object({
    courseTitle: z.string(),
    startsAt: Timestamp,
    endsAt: Timestamp,
    location: z.string(),
  }),
  createdAt: Timestamp,
});
export type Booking = z.infer<typeof Booking>;

/** POST /api/bookings — BOOK-001. Strict: a client-sent price is rejected (BOOK-001/AC2). */
export const CreateBookingRequest = z.strictObject({ appointmentId: Id });
export type CreateBookingRequest = z.infer<typeof CreateBookingRequest>;

export const CreateBookingResponse = z.object({
  booking: Booking,
  checkoutUrl: z.url(),
});
export type CreateBookingResponse = z.infer<typeof CreateBookingResponse>;

export const BookingResponse = z.object({ booking: Booking });

/** GET /api/bookings?scope= — BOOK-007 */
export const BookingListQuery = z.object({
  scope: z.enum(['upcoming', 'past']).default('upcoming'),
});
export const BookingListResponse = listOf(Booking);
export type BookingListResponse = z.infer<typeof BookingListResponse>;

/** GET /api/admin/appointments/:id/bookings — BOOK-011 */
export const AdminBooking = z.object({
  id: Id,
  status: BookingStatus,
  member: z.object({ id: Id, name: z.string(), email: z.email() }),
  payment: z.object({ status: PaymentStatus, refundStatus: RefundStatus }).nullable(),
  createdAt: Timestamp,
});
export type AdminBooking = z.infer<typeof AdminBooking>;
export const AdminBookingListResponse = listOf(AdminBooking);
export type AdminBookingListResponse = z.infer<typeof AdminBookingListResponse>;
