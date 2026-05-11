import { z } from 'zod';
import { ulid, metadata } from './common';

export const datingGender = z.enum(['woman', 'man', 'non_binary', 'other', 'prefer_not_to_say']);

export const datingSeeking = z.enum([
  'long_term',
  'short_term',
  'friendship',
  'casual',
  'figuring_it_out',
]);

/** Photos are validated separately at upload-time; this is just the URL list. */
export const datingPhoto = z.object({
  url: z.string().url(),
  storagePath: z.string(),
  position: z.number().int().min(0).max(8),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  blurhash: z.string().optional(),
});

export const datingProfile = z.object({
  displayName: z.string().min(1).max(60),
  birthdate: z.string().date(),
  gender: datingGender,
  interestedIn: z.array(datingGender).min(1),
  seeking: datingSeeking,
  bio: z.string().max(500),
  photos: z.array(datingPhoto).min(1).max(9),
  prompts: z
    .array(
      z.object({
        question: z.string().max(160),
        answer: z.string().min(1).max(280),
      }),
    )
    .max(6)
    .default([]),
  city: z.string().max(120).optional(),
  countryCode: z.string().length(2).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  heightCm: z.number().int().min(120).max(230).optional(),
  jobTitle: z.string().max(120).optional(),
  company: z.string().max(120).optional(),
  school: z.string().max(120).optional(),
  metadata,
});

export const swipeAction = z.enum(['like', 'pass', 'super_like']);

export const recordSwipe = z.object({
  tenantId: ulid,
  toUserId: ulid,
  action: swipeAction,
});

export const discoveryFilters = z.object({
  minAge: z.number().int().min(18).max(99).default(18),
  maxAge: z.number().int().min(18).max(99).default(60),
  distanceKm: z.number().int().min(1).max(500).default(50),
  genders: z.array(datingGender).min(1).optional(),
});

export type DatingProfile = z.infer<typeof datingProfile>;
export type SwipeAction = z.infer<typeof swipeAction>;
export type RecordSwipeInput = z.infer<typeof recordSwipe>;
export type DiscoveryFilters = z.infer<typeof discoveryFilters>;
