# Scheduling — interface

Import from `apps/api/src/modules/scheduling/public.ts`.

## Service `scheduling.appointments` (provided)

```ts
export interface AppointmentForBooking {
  id: string;
  courseId: string;
  courseTitle: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  priceCents: number;
  location: string;
  status: 'scheduled' | 'cancelled';
  courseActive: boolean;
}

export interface AppointmentDirectory {
  get(id: string): Promise<AppointmentForBooking | null>;
  getMany(ids: string[]): Promise<AppointmentForBooking[]>;
}
```

## Port `scheduling.occupancy` (required — booking implements it)

```ts
export interface OccupancyProvider {
  /** Seats taken (confirmed + unexpired holds) per appointment id. Missing ids = 0. */
  seatsTaken(appointmentIds: string[]): Promise<Map<string, number>>;
}
```

Scheduling calls `ctx.services.require('scheduling.occupancy')` lazily, at request
time. Tests use `fakeOccupancy({ [appointmentId]: 3 })` from `scheduling/testing.ts`.
The same file has `fakeAppointments([...])` for consumers such as booking.

## Events (published)

| Type                    | Payload                                        |
| ----------------------- | ---------------------------------------------- |
| `appointment.cancelled` | `{ appointmentId: string; reason?: string }`   |
| `appointment.updated`   | `{ appointmentId: string; changed: string[] }` |

## Error codes added

`COURSE_NOT_SCHEDULABLE` (422).

## HTTP contract

`packages/contracts/src/scheduling.ts`: `Appointment`, `AdminAppointment`,
`CreateAppointmentRequest`, `CreateSeriesRequest`, `UpdateAppointmentRequest`,
`CancelAppointmentRequest`, list responses.

## Web routes owned

- Member app: `/schedule` (with `?courseId=`). It links to `/book/:appointmentId`.
- Admin portal: `/appointments` (calendar/list), `/appointments/new`,
  `/appointments/series/new`, `/appointments/:id/edit`. They link to
  `/appointments/:id/attendees`.
