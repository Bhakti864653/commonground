import { CommunityConfigSchema, type CommunityConfig } from "@/lib/schema/community";

/**
 * A wholly fictional community that exists only to prove CommunityConfig generalizes beyond
 * Santiago de Veraguas — different country, language default, and category set. Spec §3/§23:
 * `status: "demo"` and every UI surface referencing this community must visibly label it as
 * fictional demonstration data.
 */
const riverbendConfig: CommunityConfig = {
  id: "riverbend-demo",
  displayName: "Riverbend (fictional demonstration community)",
  country: "Fictional",
  region: undefined,
  defaultLanguage: "en",
  supportedLanguages: ["en", "es"],
  status: "demo",
  categories: [
    {
      id: "streetlights",
      label: "Broken streetlights",
      labelEs: "Luminarias dañadas",
      icon: "lightbulb",
    },
    {
      id: "park-maintenance",
      label: "Park maintenance",
      labelEs: "Mantenimiento de parques",
      icon: "trees",
    },
    {
      id: "transit",
      label: "Public transit issue",
      labelEs: "Problema de transporte público",
      icon: "bus",
    },
    {
      id: "other",
      label: "Other",
      labelEs: "Otro",
      icon: "more-horizontal",
    },
  ],
  areas: [
    { id: "downtown", label: "Downtown", labelEs: "Centro", kind: "neighborhood" },
    { id: "riverside", label: "Riverside", labelEs: "Ribera", kind: "neighborhood" },
    { id: "hillcrest", label: "Hillcrest", labelEs: "Hillcrest", kind: "neighborhood" },
  ],
  trustedSources: [],
  officialContacts: [],
  privacy: {
    anonymousByDefault: true,
    consentVersion: "2026-09-19.v1",
    consentTextEs:
      "Tu información se utilizará para organizar y revisar esta contribución comunitaria de demostración. No mostraremos públicamente tu identidad ni una ubicación exacta.",
    consentTextEn:
      "Your information will be used to organize and review this demonstration community contribution. We will not publicly display your identity or an exact location.",
  },
  moderation: {
    requireReviewBeforePublish: true,
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

export const RIVERBEND_DEMO = CommunityConfigSchema.parse(riverbendConfig);
