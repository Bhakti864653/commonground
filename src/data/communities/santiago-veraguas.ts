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
  // The town's center point as published by OpenStreetMap (Nominatim, relation 11195657).
  map: { center: { lat: 8.099, lng: -80.9804 }, radiusKm: 1.6 },
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
    { id: "centro", label: "Central area", labelEs: "Área central", kind: "neighborhood", mapDirection: "center", labels: { pt: "Área central", fr: "Zone centrale", zh: "中心区", hi: "केंद्रीय इलाका", it: "Zona centrale" } },
    { id: "norte", label: "Northern area", labelEs: "Área norte", kind: "neighborhood", mapDirection: "north", labels: { pt: "Área norte", fr: "Zone nord", zh: "北区", hi: "उत्तरी इलाका", it: "Zona nord" } },
    { id: "sur", label: "Southern area", labelEs: "Área sur", kind: "neighborhood", mapDirection: "south", labels: { pt: "Área sul", fr: "Zone sud", zh: "南区", hi: "दक्षिणी इलाका", it: "Zona sud" } },
    { id: "este", label: "Eastern area", labelEs: "Área este", kind: "neighborhood", mapDirection: "east", labels: { pt: "Área leste", fr: "Zone est", zh: "东区", hi: "पूर्वी इलाका", it: "Zona est" } },
    { id: "oeste", label: "Western area", labelEs: "Área oeste", kind: "neighborhood", mapDirection: "west", labels: { pt: "Área oeste", fr: "Zone ouest", zh: "西区", hi: "पश्चिमी इलाका", it: "Zona ovest" } },
  ],
  // Every entry below was re-checked against its official page on 2026-09-25 in the
  // source-verification pass documented in docs/MCP_RESEARCH_AUDIT.md — nothing is added without a
  // real, checkable primary source (spec §23/§26). Moderators can add, remove, or re-verify
  // entries at /admin/sources.
  trustedSources: [
    {
      id: "municipio-santiago",
      name: "Municipio de Santiago",
      url: "https://santiago.municipios.gob.pa/",
      verified: true,
      lastVerifiedAt: "2026-09-25",
      trustLevel: "official_verified",
      verificationNote: "The municipality's page on the national Municipios Digitales portal.",
    },
    {
      id: "alcaldia-santiago",
      name: "Alcaldía de Santiago",
      url: "https://alcaldiadesantiago.gob.pa/",
      verified: true,
      lastVerifiedAt: "2026-09-25",
      trustLevel: "official_verified",
      verificationNote: "The mayor's office site for the district of Santiago, Veraguas; lists its office phone and address.",
    },
    {
      id: "sume-911",
      name: "SUME 9-1-1 — Sistema Único de Manejo de Emergencias",
      url: "https://sume911.pa/",
      verified: true,
      lastVerifiedAt: "2026-09-25",
      trustLevel: "official_verified",
      verificationNote: "Operator of the 9-1-1 line; explains that non-medical emergencies are transferred to the right institution.",
    },
    {
      id: "sinaproc",
      name: "SINAPROC — Sistema Nacional de Protección Civil",
      url: "https://www.sinaproc.gob.pa/",
      verified: true,
      lastVerifiedAt: "2026-09-25",
      trustLevel: "official_verified",
    },
    {
      id: "bomberos-panama",
      name: "Benemérito Cuerpo de Bomberos de la República de Panamá",
      url: "https://www.bomberos.gob.pa/",
      verified: true,
      lastVerifiedAt: "2026-09-25",
      trustLevel: "official_verified",
    },
  ],
  officialContacts: [
    {
      id: "emergencias-911",
      name: "National emergency line",
      nameEs: "Línea nacional de emergencias",
      labels: { pt: "Linha nacional de emergência", fr: "Numéro national d’urgence", zh: "全国紧急电话", hi: "राष्ट्रीय आपातकालीन नंबर", it: "Numero nazionale di emergenza" },
      phone: "911",
      channel: "phone",
      url: "https://sume911.pa/",
      isEmergencyService: true,
      verified: true,
      sourceUrl: "https://sume911.pa/acerca-de/como-funciona",
      lastVerifiedAt: "2026-09-25",
      verificationNote: "SUME 9-1-1: free from any phone; non-medical emergencies are transferred to police, fire, or civil protection.",
    },
    {
      id: "bomberos-103",
      name: "Fire department (Bomberos de Panamá)",
      nameEs: "Bomberos de Panamá",
      labels: { pt: "Bombeiros (Bomberos de Panamá)", fr: "Pompiers (Bomberos de Panamá)", zh: "消防队（Bomberos de Panamá）", hi: "अग्निशमन विभाग (Bomberos de Panamá)", it: "Vigili del fuoco (Bomberos de Panamá)" },
      phone: "103",
      channel: "phone",
      url: "https://www.bomberos.gob.pa/",
      isEmergencyService: true,
      verified: true,
      sourceUrl: "https://www.bomberos.gob.pa/2025/08/05/vas-a-llamar-al-103-estas-son-las-recomendaciones-clave-para-una-atencion-rapida-y-efectiva/",
      lastVerifiedAt: "2026-09-25",
      verificationNote: "Bomberos: 103 is its direct line, available 24 hours, for fires, rescues, and similar emergencies.",
    },
    {
      id: "sinaproc-whatsapp",
      name: "Civil protection emergencies, WhatsApp, 24 hours (SINAPROC)",
      nameEs: "Emergencias de protección civil por WhatsApp, 24 horas (SINAPROC)",
      labels: { pt: "Emergências de proteção civil por WhatsApp, 24 horas (SINAPROC)", fr: "Urgences de protection civile sur WhatsApp, 24 h/24 (SINAPROC)", zh: "民防紧急情况 WhatsApp，24 小时（SINAPROC）", hi: "नागरिक सुरक्षा आपात स्थिति, WhatsApp, 24 घंटे (SINAPROC)", it: "Emergenze di protezione civile su WhatsApp, 24 ore (SINAPROC)" },
      phone: "+507 6998-4809",
      channel: "whatsapp",
      url: "https://www.sinaproc.gob.pa/",
      isEmergencyService: true,
      verified: true,
      sourceUrl: "https://www.sinaproc.gob.pa/directorio-telefonico/",
      lastVerifiedAt: "2026-09-25",
      verificationNote: "SINAPROC: “WhatsApp 6998-4809 desde cualquier teléfono las 24 horas del día”.",
    },
    {
      id: "alcaldia-santiago-oficina",
      name: "Mayor's office of Santiago (Alcaldía), general office line",
      nameEs: "Alcaldía de Santiago, teléfono de oficina",
      labels: { pt: "Prefeitura de Santiago (Alcaldía), telefone do escritório", fr: "Mairie de Santiago (Alcaldía), ligne du bureau", zh: "圣地亚哥市长办公室（Alcaldía）办公电话", hi: "सैंटियागो महापौर कार्यालय (Alcaldía), कार्यालय फ़ोन", it: "Municipio di Santiago (Alcaldía), telefono dell’ufficio" },
      phone: "935-2444",
      channel: "phone",
      url: "https://alcaldiadesantiago.gob.pa/",
      isEmergencyService: false,
      verified: true,
      sourceUrl: "https://alcaldiadesantiago.gob.pa/",
      lastVerifiedAt: "2026-09-25",
      verificationNote: "Listed on the Alcaldía's official site as “Tel: 935-2444 / 935-2445”, with its office on Av. Héctor Alejandro Santacoloma. An office line, not for emergencies.",
    },
  ],
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
    // The 3D view was removed (docs/3D_EXPERIENCE.md); nothing reads this legacy flag.
    threeDView: false,
    aiGuide: true,
    proposals: true,
    duplicateDetection: true,
  },
};

export const SANTIAGO_VERAGUAS = CommunityConfigSchema.parse(santiagoVeraguasConfig);
