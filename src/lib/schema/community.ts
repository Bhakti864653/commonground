import { z } from "zod";

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
});
export type CategoryConfig = z.infer<typeof CategoryConfigSchema>;
/** Alias matching the model name from the CommonGround spec §22. */
export type ReportCategory = CategoryConfig;

export const AreaConfigSchema = z.object({
  id: z.string(),
  label: z.string(),
  labelEs: z.string(),
  kind: z.enum(["neighborhood", "landmark", "region"]),
});
export type AreaConfig = z.infer<typeof AreaConfigSchema>;

export const SourceConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  lastVerifiedAt: z.string(),
  trustLevel: z.enum(["official_verified", "community_trusted"]),
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
  phone: z.string().optional(),
  url: z.string().url().optional(),
  isEmergencyService: z.boolean().default(false),
  verified: z.boolean().default(false),
  sourceUrl: z.string().url().optional(),
  lastVerifiedAt: z.string().optional(),
});
export type ContactConfig = z.infer<typeof ContactConfigSchema>;
export type OfficialContact = ContactConfig;

export const PrivacyConfigSchema = z.object({
  anonymousByDefault: z.literal(true).default(true),
  consentVersion: z.string(),
  consentTextEs: z.string(),
  consentTextEn: z.string(),
});
export type PrivacyConfig = z.infer<typeof PrivacyConfigSchema>;

export const ModerationConfigSchema = z.object({
  requireReviewBeforePublish: z.boolean().default(true),
  moderatorEmails: z.array(z.string().email()).default([]),
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

export const CommunityConfigSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  country: z.string(),
  region: z.string().optional(),
  defaultLanguage: z.enum(["es", "en"]),
  supportedLanguages: z.array(z.enum(["es", "en"])).min(1),
  /** "demo" communities must be labeled as fictional everywhere they render (spec §3, §23). */
  status: z.enum(["pilot", "active", "demo"]),
  categories: z.array(CategoryConfigSchema).min(1),
  areas: z.array(AreaConfigSchema),
  trustedSources: z.array(SourceConfigSchema),
  officialContacts: z.array(ContactConfigSchema),
  privacy: PrivacyConfigSchema,
  moderation: ModerationConfigSchema,
  enabledFeatures: FeatureFlagsSchema,
});
export type CommunityConfig = z.infer<typeof CommunityConfigSchema>;
