import { ENTITLEMENT_KEYS } from '@goldspire/config';
import type { BlueprintDefinition } from './types';

export const multiStaffBookingBlueprint: BlueprintDefinition = {
  kind: 'multi_staff_booking',
  name: 'Multi-Staff Booking',
  tagline: 'Salons, clinics, studios — bookings with multi-staff scheduling and deposits.',
  description:
    'A booking system designed for service businesses with multiple staff members. Customers pick a service, see staff with real availability, and book with optional deposit. Unlike generic 1:1 booking (Cal.com), this handles team coordination, room/resource allocation, and no-show policy.',
  maturity: 'beta',
  accent: '#7C5CFF',
  referenceAppFolder: 'booking-web',
  defaultTenantSlug: 'nova',
  defaultPort: 3010,
  localDevCommand: 'pnpm --filter @goldspire/booking-web dev',
  demoUrl: 'http://localhost:3010',
  badgeAccent: '#7C5CFF',
  badgeLabel: 'Booking',
  industryAliases: ['wellness', 'booking', 'salon', 'scheduling', 'clinic'],
  defaultSlugPrefix: 'bookings',
  entitlementKeys: [
    ENTITLEMENT_KEYS.BOOKING_ADVANCED_CALENDAR,
    ENTITLEMENT_KEYS.BOOKING_DEPOSITS,
    ENTITLEMENT_KEYS.BOOKING_TEAM_SCHEDULING,
    ENTITLEMENT_KEYS.BOOKING_SMS_REMINDERS,
  ],
  prototypePriceCents: 5_500_00,
  retainerPriceCents: 1_800_00,
  estimatedWeeks: { min: 2, max: 4 },
  nav: [
    { label: 'Calendar', href: '/calendar', icon: 'calendar' },
    { label: 'Services', href: '/services', icon: 'list' },
    { label: 'Staff', href: '/staff', icon: 'users' },
    { label: 'Customers', href: '/customers', icon: 'user-circle' },
  ],
  aiSurface: [
    {
      feature: 'Business description rewrite',
      description: 'Improves the public-facing description from the operator’s notes.',
      defaultEnabled: false,
      flagKey: 'ai.business_copy',
    },
  ],
  clientNotes: [
    'Calendar timezone handling is the #1 source of bugs. Verify business timezone settings before launch.',
    'No-show policy + deposits significantly improve unit economics. Push for the client to enable them.',
  ],
};
