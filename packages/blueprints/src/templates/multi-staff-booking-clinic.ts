import type { ProductTemplate } from './types';

/**
 * `multi_staff_booking/clinic` — Tier 1 clone for Nova Care–style scheduling.
 * Matches seed products on tenant `nova-care` and the `booking-web` reference app.
 */
export const multiStaffBookingClinicTemplate: ProductTemplate = {
  id: 'multi_staff_booking/clinic',
  blueprint: 'multi_staff_booking',
  name: 'Clinic & salon booking',
  tagline: 'Multi-staff services, public booking flow, and membership SKUs — Nova Care reference shape.',
  description:
    'Telehealth, clinic, salon, or studio scheduling on the multi-staff booking blueprint: landing + services catalog, guided book flow, staff-aware availability, and Stripe-ready product rows (visit, specialist, membership). Nova Care (`nova-care`) is the seeded reference tenant; `booking-web` is the operator-facing demo app.',
  status: 'shipped',
  useCases: [
    'Virtual-first clinics and telehealth intake',
    'Multi-clinician practices with tiered visit types',
    'Salons and studios with named staff and deposits',
    'Membership + à-la-carte hybrid revenue',
  ],
  referenceTenantSlug: 'nova-care',
  referenceAppFolder: 'booking-web',
  brand: {
    defaultTagline: 'Virtual care, booked in one flow.',
    defaultPrimaryHex: '#7C5CFF',
    defaultAccentHex: '#22D3EE',
    iconName: 'calendar',
    hero: {
      headline: 'Book the right clinician, first time.',
      sub: 'Services, staff, and slots — ready to brand for your market.',
    },
    toneDescriptors: ['clinical', 'efficient', 'trustworthy', 'modern'],
  },
  products: [
    {
      name: 'Standard Visit',
      slug: 'standard-visit',
      config: { slotMinutes: 30, bufferMinutes: 10 },
    },
    {
      name: 'Specialist Consult',
      slug: 'specialist-consult',
      config: { slotMinutes: 45 },
    },
    {
      name: 'Annual Membership',
      slug: 'annual-membership',
      config: { visitsIncluded: 12 },
    },
  ],
  flagOverrides: [{ key: 'compliance.gdpr_strict', kind: 'feature', enabled: true }],
  pricing: {
    effortMultiplier: 1.0,
    /** Aligned with `TIER1_BOOKING_CLONE_PRESET` (€18.5k). */
    startsAtPriceCents: 18_500_00,
    typicalWeeks: { min: 5, max: 8 },
    reason: 'Nova reference path — scheduling + SKUs without bespoke marketplace logic.',
  },
  discoveryQuestions: [
    { id: 'services', question: 'What services and durations should appear first in the catalog?' },
    { id: 'staff_model', question: 'Shared pool vs per-room resources? Any equipment constraints?' },
    { id: 'deposits', question: 'Deposits or card-on-file for no-shows — required at launch?' },
    { id: 'timezone', question: 'Single timezone or multi-region staff?' },
    { id: 'payments', question: 'Stripe only at MVP, or invoices / insurance later?' },
    { id: 'notifications', question: 'SMS reminders in scope for v1 or email-only?' },
  ],
  clientNotes: [
    'Calendar edge cases (DST, buffer rules) are where scope creep hides — freeze rules in kickoff.',
    'If deposits are promised in sales, wire capture + refund policy before public launch.',
  ],
  heroScreens: ['Marketing landing', 'Services grid', 'Book flow', 'Bookings dashboard'],
};
