import { z } from "zod";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";

/** Translations beyond English (`label`) and Spanish (`labelEs`); missing ones fall back to English. */
export const ExtraTranslationsSchema = z
  .object({ pt: z.string(), fr: z.string(), zh: z.string(), hi: z.string(), it: z.string() })
  .partial();

/**
 * A category is always shown with both an icon and a text label (spec §6:
 * "Do not use icons without text") — labelEs/label make that unavoidable at the type level.
 */
export const CategoryConfigSchema = z.object({
  id: z.string(),
  label: z.string(),
  labelEs: z.string(),
  description: z.string().optional(),
  descriptionEs: z.string().optional(),
  icon: z.string(),
  labels: ExtraTranslationsSchema.optional(),
});
export type CategoryConfig = z.infer<typeof CategoryConfigSchema>;
/** Alias matching the model name from the CommonGround spec §22. */
export type ReportCategory = CategoryConfig;

/** Where an area's zone sits on the street map, relative to the community's center point. */
export const MAP_DIRECTIONS = ["center", "north", "south", "east", "west"] as const;
export type MapDirection = (typeof MAP_DIRECTIONS)[number];

export const AreaConfigSchema = z.object({
  id: z.string(),
  label: z.string(),
  labelEs: z.string(),
  kind: z.enum(["neighborhood", "landmark", "region"]),
  labels: ExtraTranslationsSchema.optional(),
  /** Set by whoever configures the community; an area without one is not drawn on the street map. */
  mapDirection: z.enum(MAP_DIRECTIONS).optional(),
});
export type AreaConfig = z.infer<typeof AreaConfigSchema>;

/**
 * http(s) only: a bare URL check accepts `javascript:` URIs, and these URLs are rendered as public
 * links. Zod 4's top-level `z.url()` with a `protocol` pattern is the documented way to restrict
 * this (`z.string().url()` is deprecated in Zod 4).
 */
export const HttpUrlSchema = z
  .url({ protocol: /^https?$/, error: "Must be a valid http:// or https:// URL" })
  .trim()
  .max(2000);

/** A short, public note on what exactly was checked, e.g. "103 listed as the 24-hour line". */
const VerificationNoteSchema = z.string().trim().max(300).optional();

/**
 * `verified` defaults to false: an entry is only presented as checked when someone explicitly
 * says so and gives the date (see src/lib/sources/freshness.ts).
 */
export const SourceConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: HttpUrlSchema,
  verified: z.boolean().default(false),
  lastVerifiedAt: z.string().optional(),
  trustLevel: z.enum(["official_verified", "community_trusted"]),
  verificationNote: VerificationNoteSchema,
});
export type SourceConfig = z.infer<typeof SourceConfigSchema>;
export type Source = SourceConfig;

/**
 * `verified: false` forces the UI down the "Por verificar" path (spec §20) rather than
 * displaying a contact as if it were confirmed.
 */
export const ContactConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameEs: z.string().optional(),
  labels: ExtraTranslationsSchema.optional(),
  phone: z.string().optional(),
  /** How the number is reached — a WhatsApp-only line gets a WhatsApp link, not a phone call. */
  channel: z.enum(["phone", "whatsapp"]).default("phone"),
  url: HttpUrlSchema.optional(),
  isEmergencyService: z.boolean().default(false),
  verified: z.boolean().default(false),
  sourceUrl: HttpUrlSchema.optional(),
  lastVerifiedAt: z.string().optional(),
  verificationNote: VerificationNoteSchema,
});
export type ContactConfig = z.infer<typeof ContactConfigSchema>;
export type OfficialContact = ContactConfig;

export const PrivacyConfigSchema = z.object({
  anonymousByDefault: z.literal(true).default(true),
  consentVersion: z.string(),
  consentTextEs: z.string(),
  consentTextEn: z.string(),
  consentTexts: ExtraTranslationsSchema.optional(),
});
export type PrivacyConfig = z.infer<typeof PrivacyConfigSchema>;

export const ModerationConfigSchema = z.object({
  requireReviewBeforePublish: z.boolean().default(true),
  moderatorEmails: z.array(z.email()).default([]),
});
export type ModerationConfig = z.infer<typeof ModerationConfigSchema>;

export const FeatureFlagsSchema = z.object({
  mapView: z.boolean().default(true),
  threeDView: z.boolean().default(false),
  aiGuide: z.boolean().default(true),
  proposals: z.boolean().default(true),
  duplicateDetection: z.boolean().default(true),
});
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

/**
 * Where the community is on a real street map. `center` is the town's public center point (from
 * OpenStreetMap), never a resident's location; `radiusKm` is roughly how far the configured
 * areas reach from it. Communities without this (e.g. the fictional demo) keep the illustrative
 * map, because a fictional place must never be drawn onto real streets.
 */
export const MapSettingsSchema = z.object({
  center: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  radiusKm: z.number().min(0.3).max(30),
});
export type MapSettings = z.infer<typeof MapSettingsSchema>;

export const CommunityConfigSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  country: z.string(),
  region: z.string().optional(),
  defaultLanguage: z.enum(LANGUAGE_CODES),
  supportedLanguages: z.array(z.enum(LANGUAGE_CODES)).min(1),
  /**
   * "demo" communities must be labeled as fictional everywhere they render (spec §3, §23).
   * "starter" communities were started automatically when a visitor added a place: they accept
   * reports, but no moderator has reviewed them yet, and that is shown on every page.
   */
  status: z.enum(["pilot", "active", "demo", "starter"]),
  categories: z.array(CategoryConfigSchema).min(1),
  areas: z.array(AreaConfigSchema),
  trustedSources: z.array(SourceConfigSchema),
  officialContacts: z.array(ContactConfigSchema),
  privacy: PrivacyConfigSchema,
  moderation: ModerationConfigSchema,
  enabledFeatures: FeatureFlagsSchema,
  map: MapSettingsSchema.optional(),
});
export type CommunityConfig = z.infer<typeof CommunityConfigSchema>;
