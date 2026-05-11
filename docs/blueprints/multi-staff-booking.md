# Blueprint · Multi-Staff Booking

Reference app: [`apps/booking-web`](../../apps/booking-web). Tenant: `nova`.

## When to use it

Service businesses where one customer books one staff member for one slot — salons, spas,
clinics, tutors, repair shops, coaches. **Not** restaurant reservations (different model;
optimize for table-fit, not staff-fit).

## Data model

- `business` — one or many per product. Has timezone, currency, address.
- `staff` — practitioners working under a business.
- `service` — what gets booked. Duration + price.
- `business_hours` — staff availability windows.
- `booking` — the actual appointment. Status enum: `pending`, `confirmed`, `canceled`,
  `completed`, `no_show`.

## API

| Procedure                  | Who         | Notes                                       |
|----------------------------|-------------|---------------------------------------------|
| `booking.businesses`       | signed-in   | All businesses under a product              |
| `booking.services`         | signed-in   | All services for a business                 |
| `booking.staff`            | signed-in   | All staff for a business                    |
| `booking.bookings`         | tenant admin| All bookings for a business (mgmt view)     |
| `booking.createBusiness`   | tenant admin| —                                           |
| `booking.createService`    | tenant admin| —                                           |
| `booking.createBooking`    | signed-in   | Computes `endsAt`, snapshots `priceCents`   |

## Screens

- `/` — branded landing
- `/services` — service grid
- `/book` — service picker + staff picker + datetime
- `/bookings` — admin-style booking list

## What's intentionally missing in v1 (you'll likely need it for prod)

- Real availability engine. Right now you can double-book a staff member; the API doesn't
  cross-check `business_hours` or existing bookings. Add this *before* taking real customers.
- Calendar sync (Google Cal / Outlook / iCal).
- Customer self-rescheduling.
- Confirmation emails (drop in `@goldspire/notifications`).
- Stripe deposit hold + capture on no-show.

## Upgrade path

- v1.1 — availability engine + double-book prevention. `packages/booking-core` (new package).
- v1.2 — calendar sync via Cronofy or Google Calendar API.
- v1.3 — SMS reminders via Twilio.
- v2.0 — multi-resource bookings (e.g. staff + room).
