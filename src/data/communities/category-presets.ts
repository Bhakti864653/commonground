import type { CategoryConfig } from "@/lib/schema/community";

/**
 * The categories a moderator can choose from when setting up a new community. Icons are keys
 * in components/icons/category-icon-map.tsx. "other" is always included so a resident is
 * never forced into a category that doesn't fit.
 */
export const CATEGORY_PRESETS = [
  { id: "flooding-drainage", label: "Flooding or blocked drainage", labelEs: "Inundación o drenaje bloqueado", icon: "droplet" },
  { id: "garbage-sanitation", label: "Garbage and sanitation", labelEs: "Basura y saneamiento", icon: "trash" },
  { id: "road-infrastructure", label: "Damaged road or public infrastructure", labelEs: "Vía o infraestructura pública dañada", icon: "road" },
  { id: "street-lighting", label: "Street lighting", labelEs: "Alumbrado público", icon: "lightbulb" },
  { id: "green-spaces", label: "Parks and green spaces", labelEs: "Parques y áreas verdes", icon: "trees" },
  { id: "public-transport", label: "Public transport and stops", labelEs: "Transporte público y paradas", icon: "bus" },
  { id: "other", label: "Other", labelEs: "Otro", icon: "more-horizontal" },
] as const satisfies readonly CategoryConfig[];

export type CategoryPresetId = (typeof CATEGORY_PRESETS)[number]["id"];

export const CATEGORY_PRESET_IDS = CATEGORY_PRESETS.map((c) => c.id) as [CategoryPresetId, ...CategoryPresetId[]];
