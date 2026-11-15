// In-memory fakes of payments' services for OTHER modules' tests (no Stripe, no network).
import { randomUUID } from 'node:crypto';
import { AppError } from '../../core/errors.js';
import type {
  CheckoutService,
  CreateCheckoutInput,
  PaymentStatus,
  PaymentStatusReader,
  RefundService,
  RefundStatus,
} from './public.js';

export interface FakeCheckout extends CheckoutService {
  created: CreateCheckoutInput[];
  expired: string[];
  /** The next create() call throws PAYMENT_PROVIDER_ERROR. */
  failNext(): void;
}

export interface FakeRefunds extends RefundService {
  refunded: string[];
}

export interface FakeStatus extends PaymentStatusReader {
  set(bookingId: string, status: PaymentStatus, refundStatus?: RefundStatus): void;
}

export function fakePayments(): {
  'payments.checkout': FakeCheckout;
  'payments.refunds': FakeRefunds;
  'payments.status': FakeStatus;
} {
  const open = new Map<string, { paymentId: string; checkoutUrl: string }>();
  const statuses = new Map<string, { status: PaymentStatus; refundStatus: RefundStatus }>();
  let failNext = false;

  const checkout: FakeCheckout = {
    created: [],
    expired: [],
    failNext: () => void (failNext = true),
    async create(input) {
      if (failNext) {
        failNext = false;
        throw new AppError('PAYMENT_PROVIDER_ERROR', 502, 'Fake Stripe failure');
      }
      const existing = open.get(input.bookingId);
      if (existing) return existing;
      checkout.created.push(input);
      const result = {
        paymentId: randomUUID(),
        checkoutUrl: `https://checkout.test/${input.bookingId}`,
      };
      open.set(input.bookingId, result);
      statuses.set(input.bookingId, { status: 'open', refundStatus: 'none' });
      return result;
    },
    async expire(bookingId) {
      checkout.expired.push(bookingId);
      open.delete(bookingId);
    },
  };

  const refunds: FakeRefunds = {
    refunded: [],
    async refundForBooking(bookingId) {
      if (!refunds.refunded.includes(bookingId)) refunds.refunded.push(bookingId);
    },
  };

  const status: FakeStatus = {
    set: (id, s, r = 'none') => void statuses.set(id, { status: s, refundStatus: r }),
    forBookings: async (ids) =>
      new Map(ids.flatMap((id) => (statuses.has(id) ? [[id, statuses.get(id)!] as const] : []))),
  };

  return { 'payments.checkout': checkout, 'payments.refunds': refunds, 'payments.status': status };
}
