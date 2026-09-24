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
  supportedLanguages: ["es", "en", "pt", "fr", "zh"],
  status: "pilot",
  categories: [
    {
      id: "flooding-drainage",
      label: "Flooding or blocked drainage",
      labelEs: "Inundación o drenaje bloqueado",
      labels: { pt: "Alagamento ou drenagem entupida", fr: "Inondation ou drainage bouché", zh: "积水或排水堵塞" },
      icon: "droplet",
    },
    {
      id: "garbage-sanitation",
      label: "Garbage and sanitation",
      labelEs: "Basura y saneamiento",
      labels: { pt: "Lixo e saneamento", fr: "Déchets et assainissement", zh: "垃圾与环境卫生" },
      icon: "trash",
    },
    {
      id: "road-infrastructure",
      label: "Damaged road or public infrastructure",
      labelEs: "Vía o infraestructura pública dañada",
      labels: { pt: "Via ou infraestrutura pública danificada", fr: "Route ou infrastructure publique endommagée", zh: "道路或公共设施损坏" },
      icon: "road",
    },
    {
      id: "other",
      label: "Other",
      labelEs: "Otro",
      labels: { pt: "Outro", fr: "Autre", zh: "其他" },
      icon: "more-horizontal",
    },
  ],
  areas: [
    { id: "centro", label: "Central area", labelEs: "Área central", kind: "neighborhood", labels: { pt: "Área central", fr: "Zone centrale", zh: "中心区" } },
    { id: "norte", label: "Northern area", labelEs: "Área norte", kind: "neighborhood", labels: { pt: "Área norte", fr: "Zone nord", zh: "北区" } },
    { id: "sur", label: "Southern area", labelEs: "Área sur", kind: "neighborhood", labels: { pt: "Área sul", fr: "Zone sud", zh: "南区" } },
    { id: "este", label: "Eastern area", labelEs: "Área este", kind: "neighborhood", labels: { pt: "Área leste", fr: "Zone est", zh: "东区" } },
    { id: "oeste", label: "Western area", labelEs: "Área oeste", kind: "neighborhood", labels: { pt: "Área oeste", fr: "Zone ouest", zh: "西区" } },
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
    consentTexts: {
      pt: "Suas informações serão usadas para organizar e revisar esta contribuição comunitária. Não mostraremos publicamente sua identidade nem uma localização exata. Você pode pedir a exclusão do seu envio quando for possível.",
      fr: "Vos informations seront utilisées pour organiser et examiner cette contribution communautaire. Nous n’afficherons publiquement ni votre identité ni un lieu exact. Vous pouvez demander la suppression de votre envoi lorsque c’est possible.",
      zh: "你的信息将用于整理和审核这份社区贡献。我们不会公开显示你的身份或确切位置。在可行的情况下，你可以要求删除你的提交。",
    },
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
