import { z } from "zod";
import { COMMUNITIES } from "@/data/communities";
import { CATEGORY_PRESETS, CATEGORY_PRESET_IDS } from "@/data/communities/category-presets";
import { casePrefix } from "@/lib/case-number/format-case-number";
import { CommunityConfigSchema, MAP_DIRECTIONS, MapSettingsSchema, type CommunityConfig } from "@/lib/schema/community";

/**
 * Communities: the built-in configs (src/data/communities) plus any a moderator has set up at
 * runtime. Same prototype persistence as the case store — held on `globalThis`, so it survives
 * dev reloads but NOT a server restart, a redeploy, or (on Vercel) a different serverless
 * instance. A real database is the documented next step (ARCHITECTURE.md).
 */
type CommunityStoreState = { created: CommunityConfig[] };

function getStore(): CommunityStoreState {
  const g = globalThis as typeof globalThis & { __commonGroundCommunityStore__?: CommunityStoreState };
  if (!g.__commonGroundCommunityStore__) g.__commonGroundCommunityStore__ = { created: [] };
  return g.__commonGroundCommunityStore__;
}

export function listCommunities(): CommunityConfig[] {
  return [...COMMUNITIES, ...getStore().created];
}

export function getCommunity(id: string): CommunityConfig | undefined {
  return listCommunities().find((c) => c.id === id);
}

const name = z.string().trim().min(2).max(60);
const areaLabel = z.string().trim().min(1).max(40);

/** Validated at runtime — the admin action is a public endpoint callable with any JSON. */
export const NewCommunityInputSchema = z.object({
  displayName: name,
  country: name,
  region: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : undefined)),
  areas: z
    .array(z.object({ labelEs: areaLabel, label: areaLabel, mapDirection: z.enum(MAP_DIRECTIONS).optional() }))
    .min(1)
    .max(12)
    // Two areas in the same direction would draw the same zone twice.
    .refine((areas) => {
      const directions = areas.flatMap((a) => (a.mapDirection ? [a.mapDirection] : []));
      return new Set(directions).size === directions.length;
    }),
  categoryIds: z.array(z.enum(CATEGORY_PRESET_IDS)).min(1).max(CATEGORY_PRESET_IDS.length),
  /** The town's public center point — never a resident's location. Optional: without it the community keeps the illustrative map. */
  map: MapSettingsSchema.optional(),
});
export type NewCommunityInput = z.input<typeof NewCommunityInputSchema>;

export type CreateCommunityResult =
  | { ok: true; community: CommunityConfig }
  | { ok: false; error: "invalid" | "duplicate_name" };

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function slugify(text: string): string {
  const slug = normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "community";
}

/**
 * A unique id whose case-number prefix is also unique: "Santa Valeria" would otherwise get
 * "SV", the same prefix as Santiago de Veraguas, and their case numbers would collide.
 */
function uniqueCommunityId(displayName: string, existing: CommunityConfig[]): string {
  const base = slugify(displayName);
  const ids = new Set(existing.map((c) => c.id));
  const prefixes = new Set(existing.map((c) => casePrefix(c.id)));
  let candidate = base;
  for (let n = 2; ids.has(candidate) || prefixes.has(casePrefix(candidate)); n++) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}

function uniqueAreaIds(areas: { labelEs: string; label: string }[]): string[] {
  const seen = new Set<string>();
  return areas.map((area) => {
    const base = slugify(area.labelEs);
    let id = base;
    for (let n = 2; seen.has(id); n++) id = `${base}-${n}`;
    seen.add(id);
    return id;
  });
}

export function createCommunity(rawInput: unknown): CreateCommunityResult {
  const parsed = NewCommunityInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const input = parsed.data;

  const existing = listCommunities();
  if (existing.some((c) => normalize(c.displayName) === normalize(input.displayName))) {
    return { ok: false, error: "duplicate_name" };
  }

  const areaIds = uniqueAreaIds(input.areas);
  const categoryIds = new Set([...input.categoryIds, "other"]);
  const candidate: CommunityConfig = {
    id: uniqueCommunityId(input.displayName, existing),
    displayName: input.displayName,
    country: input.country,
    region: input.region,
    defaultLanguage: "es",
    supportedLanguages: ["es", "en", "pt", "fr", "zh", "hi", "it"],
    status: "pilot",
    categories: CATEGORY_PRESETS.filter((c) => categoryIds.has(c.id)).map((c) => ({ ...c })),
    areas: input.areas.map((area, i) => ({
      id: areaIds[i],
      label: area.label,
      labelEs: area.labelEs,
      kind: "neighborhood",
      // Directions only mean something on a street map.
      mapDirection: input.map ? area.mapDirection : undefined,
    })),
    // No official sources or contacts until a moderator verifies real ones — never invented.
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
    moderation: { requireReviewBeforePublish: true, moderatorEmails: [] },
    enabledFeatures: { mapView: true, threeDView: false, aiGuide: true, proposals: true, duplicateDetection: true },
    map: input.map,
  };

  const community = CommunityConfigSchema.parse(candidate);
  getStore().created.push(community);
  return { ok: true, community };
}

/** Test-only reset. */
export function __resetCommunityStoreForTests(): void {
  getStore().created = [];
}
