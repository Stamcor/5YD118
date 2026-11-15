# Booking — interface

Import from `apps/api/src/modules/booking/public.ts`.

## Provides

- **`scheduling.occupancy`** — implements the port declared by scheduling (BOOK-010).
- **`booking.reader`**:

```ts
export type BookingStatus =
  'pending_payment' | 'confirmed' | 'expired' | 'cancelled' | 'cancelled_by_studio';

export interface BookingReader {
  get(
    id: string,
  ): Promise<{ id: string; userId: string; appointmentId: string; status: BookingStatus } | null>;
}
```

## Consumes

| Dependency   | What                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `auth`       | `auth.guards`, `auth.users`                                                                                                     |
| `scheduling` | `scheduling.appointments`; the event `appointment.cancelled`                                                                    |
| `payments`   | `payments.checkout`, `payments.refunds`, `payments.status`; the events `payment.succeeded`, `payment.expired`, `payment.failed` |

## Events (published)

| Type                | Payload                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `booking.confirmed` | `{ bookingId, userId, appointmentId }`                           |
| `booking.cancelled` | `{ bookingId, userId, appointmentId, by: 'member' \| 'studio' }` |

## HTTP contract

`packages/contracts/src/booking.ts`: `Booking`, `BookingStatus`, `CreateBookingRequest`,
`CreateBookingResponse`, `BookingListResponse`, `AdminBookingListResponse`.

## Web routes owned

- Member app: `/book/:appointmentId`, `/bookings`, `/bookings/:bookingId/return`.
- Admin portal: `/appointments/:appointmentId/attendees`.
