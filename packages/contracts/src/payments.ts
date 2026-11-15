// Owned by module `payments`. Payments exposes no member/admin endpoints, only the
// Stripe webhook. These enums are shared with booking's admin attendee list (BOOK-011).
import { z } from 'zod';

export const PaymentStatus = z.enum(['open', 'paid', 'expired', 'failed']);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const RefundStatus = z.enum(['none', 'pending', 'refunded', 'failed']);
export type RefundStatus = z.infer<typeof RefundStatus>;
