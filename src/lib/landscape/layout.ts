import { caseOffset } from "@/lib/pulse/layout";
import { ACTION_TRAIL_STAGES, STATUS_TO_TRAIL_PROGRESS, type ReportStatus } from "@/lib/schema/report";

/**
 * Pure, deterministic layout for the illustrated community landscape. There is no real
 * geography here — only the compass sense of the community's own configured area names
 * (norte/sur/este/oeste/centro), so "Área norte" sits north of the plaza the way a resident
 * would expect. Nothing is ever placed by coordinates from a report (spec: never exact
 * locations); a case's spot is derived only from its area and a hash of its id.
 */

export type Vec2 = [x: number, z: number];

/** Radius of the island the town sits on; everything is laid out inside it. */
export const ISLAND_RADIUS = 9;

const COMPASS: Record<string, Vec2> = {
  centro: [0, 0],
  norte: [0.4, -5.1],
  sur: [-0.3, 5.2],
  este: [5.5, 0.6],
  oeste: [-5.5, -0.5],
};

/** Where cases with no area ("prefer not to say") gather — a quiet corner, not the plaza. */
export const UNASSIGNED_POSITION: Vec2 = [5.2, 5.4];

export function areaPosition(areaId: string, index: number, total: number): Vec2 {
  const known = COMPASS[areaId];
  if (known) return known;
  if (total <= 0) return [0, 0];
  // Unknown area ids (another community's config) fall back to an even ring.
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(angle) * 5.2, Math.sin(angle) * 5.2];
}

export function markerPosition(caseId: string, areaCenter: Vec2): Vec2 {
  const [dx, dz] = caseOffset(caseId, 1.35);
  return [areaCenter[0] + dx, areaCenter[1] + dz];
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** A small deterministic pseudo-random sequence, so the same area always grows the same town. */
function seeded(seed: string) {
  let state = hash(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export type House = { position: Vec2; rotation: number; scale: number; tone: 0 | 1 | 2 };
export type Tree = { position: Vec2; scale: number };

/**
 * Houses ring each area's center (leaving its middle open for the activity markers); trees
 * fill between them. Deterministic per area id.
 */
export function neighborhoodFor(areaId: string, center: Vec2, houseCount = 7): { houses: House[]; trees: Tree[] } {
  const rand = seeded(areaId);
  const houses: House[] = [];
  for (let i = 0; i < houseCount; i++) {
    const angle = (i / houseCount) * Math.PI * 2 + rand() * 0.5;
    const radius = 1.9 + rand() * 0.6;
    houses.push({
      position: [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius],
      rotation: -angle + (rand() - 0.5) * 0.4,
      scale: 0.8 + rand() * 0.35,
      tone: (Math.floor(rand() * 3) % 3) as 0 | 1 | 2,
    });
  }
  const trees: Tree[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 2.7 + rand() * 0.7;
    trees.push({
      position: [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius],
      scale: 0.7 + rand() * 0.5,
    });
  }
  return { houses, trees };
}

/** How many of the five public trail stages a status has actually reached (1-based count). */
export function stagesReached(status: ReportStatus): number {
  return STATUS_TO_TRAIL_PROGRESS[status].length;
}

/** The furthest stage actually reached — never an optimistic one. */
export function currentStage(status: ReportStatus): (typeof ACTION_TRAIL_STAGES)[number] {
  const reached = STATUS_TO_TRAIL_PROGRESS[status];
  return reached[reached.length - 1];
}

/**
 * Projects landscape coordinates into a 2D SVG viewBox (used by the static illustration and the
 * case page's "roughly where" locator), so every rendering of the town agrees on where areas are.
 */
export function toSvg([x, z]: Vec2, size = 400): [number, number] {
  const scale = size / (ISLAND_RADIUS * 2.3);
  // Rounded so server and browser render byte-identical markup: their trig can differ in the
  // last floating-point digit, which would otherwise be a hydration mismatch.
  return [round2(size / 2 + x * scale), round2(size / 2 + z * scale)];
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
