// Public surface of module `scheduling`. See requirements/scheduling/interface.md.
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

/** Port declared by scheduling, implemented by booking (BOOK-010). */
export interface OccupancyProvider {
  /** Seats taken (confirmed + unexpired holds) per appointment id. Missing ids = 0. */
  seatsTaken(appointmentIds: string[]): Promise<Map<string, number>>;
}

declare module '../../core/registry.js' {
  interface ServiceMap {
    'scheduling.appointments': AppointmentDirectory;
    'scheduling.occupancy': OccupancyProvider;
  }
  interface EventMap {
    'appointment.cancelled': { appointmentId: string; reason?: string };
    'appointment.updated': { appointmentId: string; changed: string[] };
  }
}
