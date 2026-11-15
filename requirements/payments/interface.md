# Payments — interface

Import from `apps/api/src/modules/payments/public.ts`. Payments depends only on
`platform`.

## Services (provided)

```ts
export interface CheckoutService {
  create(input: {
    bookingId: string;
    amountCents: number;
    currency: string;
    description: string; // e.g. "Mat Pilates – Beginner · Mon 16 Nov 2026, 09:00"
    customerEmail: string;
    expiresAt: Date; // >= now + 30 min (Stripe minimum)
  }): Promise<{ paymentId: string; checkoutUrl: string }>; // throws PAYMENT_PROVIDER_ERROR (502)
  /** Expires the open Stripe session of the booking, if any. Idempotent. */
  expire(bookingId: string): Promise<void>;
}

export interface RefundService {
  /** Full refund of the paid payment of the booking. Idempotent; no-op if unpaid. */
  refundForBooking(bookingId: string): Promise<void>;
}

export type PaymentStatus = 'open' | 'paid' | 'expired' | 'failed';
export type RefundStatus = 'none' | 'pending' | 'refunded' | 'failed';

export interface PaymentStatusReader {
  forBookings(
    bookingIds: string[],
  ): Promise<Map<string, { status: PaymentStatus; refundStatus: RefundStatus }>>;
}
```

| Service key         | Type                  |
| ------------------- | --------------------- |
| `payments.checkout` | `CheckoutService`     |
| `payments.refunds`  | `RefundService`       |
| `payments.status`   | `PaymentStatusReader` |

## Events (published, all carry `bookingId`)

| Type                | Payload                    | When                                           |
| ------------------- | -------------------------- | ---------------------------------------------- |
| `payment.succeeded` | `{ bookingId, paymentId }` | Money received (PAY-004)                       |
| `payment.expired`   | `{ bookingId, paymentId }` | The checkout expired without payment (PAY-005) |
| `payment.failed`    | `{ bookingId, paymentId }` | Delayed payment failed (PAY-005)               |
| `payment.refunded`  | `{ bookingId, paymentId }` | Refund confirmed by Stripe (PAY-006)           |

Each event is published **at most once** per payment and transition (PAY-003).

## Testing for consumers

`fakePayments()` from `apps/api/src/modules/payments/testing.ts` provides all three
services in memory. It returns `checkoutUrl = https://checkout.test/<bookingId>`, records calls
(`.created`, `.expired`, `.refunded`), and `fake['payments.checkout'].failNext()` makes
the next checkout fail.

## HTTP

Only `POST /api/payments/webhook`, called by Stripe.
