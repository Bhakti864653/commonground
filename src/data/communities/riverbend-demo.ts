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
  supportedLanguages: ["en", "es", "pt", "fr", "zh", "hi", "it"],
  status: "demo",
  categories: [
    {
      id: "streetlights",
      label: "Broken streetlights",
      labelEs: "Luminarias dañadas",
      labels: { pt: "Postes de luz quebrados", fr: "Lampadaires en panne", zh: "路灯损坏", hi: "ख़राब स्ट्रीट लाइटें", it: "Lampioni guasti" },
      icon: "lightbulb",
    },
    {
      id: "park-maintenance",
      label: "Park maintenance",
      labelEs: "Mantenimiento de parques",
      labels: { pt: "Manutenção de parques", fr: "Entretien des parcs", zh: "公园维护", hi: "पार्क का रखरखाव", it: "Manutenzione dei parchi" },
      icon: "trees",
    },
    {
      id: "transit",
      label: "Public transit issue",
      labelEs: "Problema de transporte público",
      labels: { pt: "Problema no transporte público", fr: "Problème de transport public", zh: "公共交通问题", hi: "सार्वजनिक परिवहन की समस्या", it: "Problema del trasporto pubblico" },
      icon: "bus",
    },
    {
      id: "other",
      label: "Other",
      labelEs: "Otro",
      labels: { pt: "Outro", fr: "Autre", zh: "其他", hi: "अन्य", it: "Altro" },
      icon: "more-horizontal",
    },
  ],
  areas: [
    { id: "downtown", label: "Downtown", labelEs: "Centro", kind: "neighborhood", labels: { pt: "Centro", fr: "Centre-ville", zh: "市中心", hi: "शहर का केंद्र", it: "Centro città" } },
    { id: "riverside", label: "Riverside", labelEs: "Ribera", kind: "neighborhood", labels: { pt: "Beira-rio", fr: "Bord de rivière", zh: "河滨", hi: "नदी किनारा", it: "Lungofiume" } },
    { id: "hillcrest", label: "Hillcrest", labelEs: "Hillcrest", kind: "neighborhood", labels: { pt: "Hillcrest", fr: "Hillcrest", zh: "Hillcrest", hi: "Hillcrest", it: "Hillcrest" } },
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
    consentTexts: {
      pt: "Suas informações serão usadas para organizar e revisar esta contribuição comunitária de demonstração. Não mostraremos publicamente sua identidade nem uma localização exata.",
      fr: "Vos informations seront utilisées pour organiser et examiner cette contribution communautaire de démonstration. Nous n’afficherons publiquement ni votre identité ni un lieu exact.",
      zh: "你的信息将用于整理和审核这份演示性质的社区贡献。我们不会公开显示你的身份或确切位置。",
      hi: "आपकी जानकारी का उपयोग इस प्रदर्शन सामुदायिक योगदान को व्यवस्थित करने और उसकी समीक्षा करने के लिए किया जाएगा। हम आपकी पहचान या सटीक लोकेशन सार्वजनिक रूप से नहीं दिखाएँगे।",
      it: "Le tue informazioni saranno usate per organizzare e rivedere questo contributo dimostrativo della comunità. Non mostreremo pubblicamente la tua identità né una posizione esatta.",
    },
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
