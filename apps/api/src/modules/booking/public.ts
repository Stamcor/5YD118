// Public surface of module `booking`. See requirements/booking/interface.md.
import type { BookingStatus } from '@pilates/contracts';

export type { BookingStatus };

export interface BookingReader {
  get(
    id: string,
  ): Promise<{ id: string; userId: string; appointmentId: string; status: BookingStatus } | null>;
}

declare module '../../core/registry.js' {
  interface ServiceMap {
    'booking.reader': BookingReader;
  }
  interface EventMap {
    'booking.confirmed': { bookingId: string; userId: string; appointmentId: string };
    'booking.cancelled': {
      bookingId: string;
      userId: string;
      appointmentId: string;
      by: 'member' | 'studio';
    };
  }
}
