# Glossary

Use these words, and only these, for these concepts in specs, code, UI copy and tests.

| Term                      | Meaning                                                                                                                                        | Code name            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **Studio**                | The single Pilates business operating this system. One timezone, one currency.                                                                 | —                    |
| **Member**                | A registered end user who browses courses and books appointments. Role `member`.                                                               | `User` (role member) |
| **Admin**                 | Studio staff who use the admin portal. Role `admin`. Cannot self-register.                                                                     | `User` (role admin)  |
| **Course**                | Something the studio offers, e.g. "Mat Pilates – Beginner". It has a title, description, level, duration and defaults. It has no date.         | `Course`             |
| **Appointment**           | One dated occurrence of a course: start time, capacity, price, location, instructor. This is what admins add in the portal and what is booked. | `Appointment`        |
| **Booking**               | A member's claim on **one seat** of one appointment. Has a lifecycle (see domain model).                                                       | `Booking`            |
| **Seat hold**             | The temporary reservation of a seat while a booking is `pending_payment`. Expires after the hold time.                                         | `holdExpiresAt`      |
| **Seats left**            | `capacity − (confirmed bookings + pending_payment bookings whose hold has not expired)`.                                                       | `seatsLeft`          |
| **Bookable**              | An appointment is bookable when it is `scheduled`, its course is active, it starts after now + booking cutoff, and seats left > 0.             | `isBookable`         |
| **Booking cutoff**        | Minutes before start after which new bookings are no longer accepted. Config `BOOKING_CUTOFF_MINUTES`.                                         | —                    |
| **Hold time**             | Minutes a seat stays held while the member pays. Config `BOOKING_HOLD_MINUTES`, at least 30 (Stripe Checkout minimum).                         | —                    |
| **Cancellation deadline** | Hours before start until which a member may cancel a confirmed booking with a full refund. Config `CANCELLATION_DEADLINE_HOURS`.               | —                    |
| **Payment**               | Our record of one Stripe Checkout Session for one booking, plus its refund state.                                                              | `Payment`            |
| **Checkout**              | The Stripe-hosted payment page (Stripe Checkout Session) the member is redirected to.                                                          | `checkoutUrl`        |
| **Refund**                | Money returned to the member through Stripe. Always the full amount in v1.                                                                     | `Refund`             |
| **Domain event**          | An in-process message one module publishes and others subscribe to, e.g. `payment.succeeded`. Defined in the publisher's `interface.md`.       | `DomainEvent`        |
| **Price snapshot**        | The price copied onto the booking when it is created. Later changes to the appointment price do not affect it.                                 | `priceCents`         |

Words we avoid: "class" (clashes with programming), "session" for a dated course (we
reserve "session" for login sessions), "slot" and "event" for appointments.
