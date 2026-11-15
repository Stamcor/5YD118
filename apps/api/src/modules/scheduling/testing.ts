// Fakes for scheduling's own tests (occupancy port) and for consumers (appointments).
import { randomUUID } from 'node:crypto';
import type { AppointmentDirectory, AppointmentForBooking, OccupancyProvider } from './public.js';

export function testAppointment(
  partial: Partial<AppointmentForBooking> = {},
): AppointmentForBooking {
  const startsAt = partial.startsAt ?? new Date('2026-11-20T09:00:00.000Z');
  return {
    id: randomUUID(),
    courseId: randomUUID(),
    courseTitle: 'Mat Pilates – Beginner',
    startsAt,
    endsAt: new Date(startsAt.getTime() + 55 * 60_000),
    capacity: 12,
    priceCents: 2500,
    location: 'Studio 1',
    status: 'scheduled',
    courseActive: true,
    ...partial,
  };
}

export function fakeAppointments(list: AppointmentForBooking[] = []): {
  'scheduling.appointments': AppointmentDirectory & { put(a: AppointmentForBooking): void };
} {
  const byId = new Map(list.map((a) => [a.id, a]));
  return {
    'scheduling.appointments': {
      put: (a) => void byId.set(a.id, a),
      get: async (id) => byId.get(id) ?? null,
      getMany: async (ids) => ids.flatMap((id) => byId.get(id) ?? []),
    },
  };
}

export function fakeOccupancy(taken: Record<string, number> = {}): {
  'scheduling.occupancy': OccupancyProvider & { set(id: string, n: number): void };
} {
  const map = new Map(Object.entries(taken));
  return {
    'scheduling.occupancy': {
      set: (id, n) => void map.set(id, n),
      seatsTaken: async (ids) => new Map(ids.map((id) => [id, map.get(id) ?? 0])),
    },
  };
}
