import type { CategoryConfig } from "@/lib/schema/community";

/**
 * The categories a moderator can choose from when setting up a new community. Icons are keys
 * in components/icons/category-icon-map.tsx. "other" is always included so a resident is
 * never forced into a category that doesn't fit.
 */
export const CATEGORY_PRESETS = [
  { id: "flooding-drainage", label: "Flooding or blocked drainage", labelEs: "Inundación o drenaje bloqueado", icon: "droplet", labels: { pt: "Alagamento ou drenagem entupida", fr: "Inondation ou drainage bouché", zh: "积水或排水堵塞" } },
  { id: "garbage-sanitation", label: "Garbage and sanitation", labelEs: "Basura y saneamiento", icon: "trash", labels: { pt: "Lixo e saneamento", fr: "Déchets et assainissement", zh: "垃圾与环境卫生" } },
  { id: "road-infrastructure", label: "Damaged road or public infrastructure", labelEs: "Vía o infraestructura pública dañada", icon: "road", labels: { pt: "Via ou infraestrutura pública danificada", fr: "Route ou infrastructure publique endommagée", zh: "道路或公共设施损坏" } },
  { id: "street-lighting", label: "Street lighting", labelEs: "Alumbrado público", icon: "lightbulb", labels: { pt: "Iluminação pública", fr: "Éclairage public", zh: "路灯照明" } },
  { id: "green-spaces", label: "Parks and green spaces", labelEs: "Parques y áreas verdes", icon: "trees", labels: { pt: "Parques e áreas verdes", fr: "Parcs et espaces verts", zh: "公园与绿地" } },
  { id: "public-transport", label: "Public transport and stops", labelEs: "Transporte público y paradas", icon: "bus", labels: { pt: "Transporte público e pontos", fr: "Transports publics et arrêts", zh: "公共交通与站点" } },
  { id: "other", label: "Other", labelEs: "Otro", icon: "more-horizontal", labels: { pt: "Outro", fr: "Autre", zh: "其他" } },
] as const satisfies readonly CategoryConfig[];

export type CategoryPresetId = (typeof CATEGORY_PRESETS)[number]["id"];

export const CATEGORY_PRESET_IDS = CATEGORY_PRESETS.map((c) => c.id) as [CategoryPresetId, ...CategoryPresetId[]];
