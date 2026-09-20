import { CommunityConfigSchema, type CommunityConfig } from "@/lib/schema/community";

/**
 * The first pilot community. Per spec §3: never mention David, Chiriquí, Cherokee, or any
 * other location here — "Santiago de Veraguas, Panama" only, exactly as configured below.
 */
const santiagoVeraguasConfig: CommunityConfig = {
  id: "santiago-veraguas",
  displayName: "Santiago de Veraguas",
  country: "Panama",
  region: "Veraguas",
  defaultLanguage: "es",
  supportedLanguages: ["es", "en"],
  status: "pilot",
  categories: [
    {
      id: "flooding-drainage",
      label: "Flooding or blocked drainage",
      labelEs: "Inundación o drenaje bloqueado",
      icon: "droplet",
    },
    {
      id: "garbage-sanitation",
      label: "Garbage and sanitation",
      labelEs: "Basura y saneamiento",
      icon: "trash",
    },
    {
      id: "road-infrastructure",
      label: "Damaged road or public infrastructure",
      labelEs: "Vía o infraestructura pública dañada",
      icon: "road",
    },
    {
      id: "other",
      label: "Other",
      labelEs: "Otro",
      icon: "more-horizontal",
    },
  ],
  areas: [
    { id: "centro", label: "Central area", labelEs: "Área central", kind: "neighborhood" },
    { id: "norte", label: "Northern area", labelEs: "Área norte", kind: "neighborhood" },
    { id: "sur", label: "Southern area", labelEs: "Área sur", kind: "neighborhood" },
    { id: "este", label: "Eastern area", labelEs: "Área este", kind: "neighborhood" },
    { id: "oeste", label: "Western area", labelEs: "Área oeste", kind: "neighborhood" },
  ],
  // Empty at launch — every entry needs a real, checkable source before it ships (spec §23/§26).
  trustedSources: [],
  officialContacts: [],
  privacy: {
    anonymousByDefault: true,
    consentVersion: "2026-09-19.v1",
    consentTextEs:
      "Tu información se utilizará para organizar y revisar esta contribución comunitaria. No mostraremos públicamente tu identidad ni una ubicación exacta. Puedes solicitar la eliminación de tu envío cuando sea posible.",
    consentTextEn:
      "Your information will be used to organize and review this community contribution. We will not publicly display your identity or an exact location. You can request deletion of your submission where possible.",
  },
  moderation: {
    requireReviewBeforePublish: true,
    // Real moderator emails belong in an env var at deploy time, not committed source
    // (same pattern as Concord's ADMIN_EMAIL) — placeholder only.
    moderatorEmails: ["moderator@commonground.example"],
  },
  enabledFeatures: {
    mapView: true,
    threeDView: true,
    aiGuide: true,
    proposals: true,
    duplicateDetection: true,
  },
};

export const SANTIAGO_VERAGUAS = CommunityConfigSchema.parse(santiagoVeraguasConfig);
