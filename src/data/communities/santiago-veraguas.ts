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
  supportedLanguages: ["es", "en", "pt", "fr", "zh", "hi", "it"],
  status: "pilot",
  categories: [
    {
      id: "flooding-drainage",
      label: "Flooding or blocked drainage",
      labelEs: "Inundación o drenaje bloqueado",
      labels: { pt: "Alagamento ou drenagem entupida", fr: "Inondation ou drainage bouché", zh: "积水或排水堵塞", hi: "बाढ़ या जाम नाली", it: "Allagamento o scarico ostruito" },
      icon: "droplet",
    },
    {
      id: "garbage-sanitation",
      label: "Garbage and sanitation",
      labelEs: "Basura y saneamiento",
      labels: { pt: "Lixo e saneamento", fr: "Déchets et assainissement", zh: "垃圾与环境卫生", hi: "कचरा और सफ़ाई", it: "Rifiuti e igiene urbana" },
      icon: "trash",
    },
    {
      id: "road-infrastructure",
      label: "Damaged road or public infrastructure",
      labelEs: "Vía o infraestructura pública dañada",
      labels: { pt: "Via ou infraestrutura pública danificada", fr: "Route ou infrastructure publique endommagée", zh: "道路或公共设施损坏", hi: "क्षतिग्रस्त सड़क या सार्वजनिक ढाँचा", it: "Strada o infrastruttura pubblica danneggiata" },
      icon: "road",
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
    { id: "centro", label: "Central area", labelEs: "Área central", kind: "neighborhood", labels: { pt: "Área central", fr: "Zone centrale", zh: "中心区", hi: "केंद्रीय इलाका", it: "Zona centrale" } },
    { id: "norte", label: "Northern area", labelEs: "Área norte", kind: "neighborhood", labels: { pt: "Área norte", fr: "Zone nord", zh: "北区", hi: "उत्तरी इलाका", it: "Zona nord" } },
    { id: "sur", label: "Southern area", labelEs: "Área sur", kind: "neighborhood", labels: { pt: "Área sul", fr: "Zone sud", zh: "南区", hi: "दक्षिणी इलाका", it: "Zona sud" } },
    { id: "este", label: "Eastern area", labelEs: "Área este", kind: "neighborhood", labels: { pt: "Área leste", fr: "Zone est", zh: "东区", hi: "पूर्वी इलाका", it: "Zona est" } },
    { id: "oeste", label: "Western area", labelEs: "Área oeste", kind: "neighborhood", labels: { pt: "Área oeste", fr: "Zone ouest", zh: "西区", hi: "पश्चिमी इलाका", it: "Zona ovest" } },
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
      hi: "आपकी जानकारी का उपयोग इस सामुदायिक योगदान को व्यवस्थित करने और उसकी समीक्षा करने के लिए किया जाएगा। हम आपकी पहचान या सटीक लोकेशन सार्वजनिक रूप से नहीं दिखाएँगे। जहाँ संभव हो, आप अपनी रिपोर्ट हटाने का अनुरोध कर सकते हैं।",
      it: "Le tue informazioni saranno usate per organizzare e rivedere questo contributo della comunità. Non mostreremo pubblicamente la tua identità né una posizione esatta. Puoi chiedere l’eliminazione del tuo invio quando possibile.",
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
