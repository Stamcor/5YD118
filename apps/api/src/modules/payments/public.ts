// Public surface of module `payments`. See requirements/payments/interface.md.
import type { PaymentStatus, RefundStatus } from '@pilates/contracts';

export type { PaymentStatus, RefundStatus };

export interface CreateCheckoutInput {
  bookingId: string;
  amountCents: number;
  currency: string;
  description: string;
  customerEmail: string;
  /** >= now + 30 minutes (Stripe minimum). */
  expiresAt: Date;
}

export interface CheckoutService {
  /** Throws AppError PAYMENT_PROVIDER_ERROR (502) when Stripe fails. */
  create(input: CreateCheckoutInput): Promise<{ paymentId: string; checkoutUrl: string }>;
  /** Expire the open Stripe session of the booking, if any. Idempotent. */
  expire(bookingId: string): Promise<void>;
}

export interface RefundService {
  /** Full refund of the paid payment of the booking. Idempotent; no-op if unpaid. */
  refundForBooking(bookingId: string): Promise<void>;
}

export interface PaymentStatusReader {
  forBookings(
    bookingIds: string[],
  ): Promise<Map<string, { status: PaymentStatus; refundStatus: RefundStatus }>>;
}

type PaymentEvent = { bookingId: string; paymentId: string };

declare module '../../core/registry.js' {
  interface ServiceMap {
    'payments.checkout': CheckoutService;
    'payments.refunds': RefundService;
    'payments.status': PaymentStatusReader;
  }
  interface EventMap {
    'payment.succeeded': PaymentEvent;
    'payment.expired': PaymentEvent;
    'payment.failed': PaymentEvent;
    'payment.refunded': PaymentEvent;
  }
}
