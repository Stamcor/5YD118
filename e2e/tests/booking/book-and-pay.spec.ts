// Requirements: requirements/booking/spec.md
// The core journey of the product: select an appointment → book → pay with Stripe → confirmed.
// Uses Stripe test mode (card 4242 4242 4242 4242) and the Stripe CLI to forward webhooks.
import { test } from '@playwright/test';

test.fixme('[BOOK-001] [BOOK-006] a member books an appointment, pays on Stripe Checkout and sees it confirmed', async () => {
  // 1. log in as member
  // 2. /schedule → choose a bookable appointment → /book/:id → "Book & pay"
  // 3. on checkout.stripe.com: pay with 4242… test card
  // 4. back on /bookings/:id/return → wait for "Confirmed"
  // 5. /bookings shows the booking under "Upcoming"
});
test.fixme('[BOOK-008] a member cancels a confirmed booking before the deadline and is refunded', async () => {});
