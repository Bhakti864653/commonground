/**
 * Purely abstract positions — there is no real geography here (spec: never a real map, never
 * exact coordinates). Areas are arranged evenly around a circle; each case gets a small,
 * deterministic offset within its area's zone so the same case always renders in the same
 * spot (no jitter on re-render) without needing to store a position anywhere.
 */
export function areaPosition(
  areaIndex: number,
  totalAreas: number,
  radius = 6,
): [number, number, number] {
  if (totalAreas <= 0) return [0, 0, 0];
  const angle = (areaIndex / totalAreas) * Math.PI * 2;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function caseOffset(caseId: string, spread = 1.6): [number, number] {
  const hash = hashString(caseId);
  const x = ((hash % 1000) / 1000) * 2 - 1;
  const z = (((Math.floor(hash / 1000)) % 1000) / 1000) * 2 - 1;
  return [x * spread, z * spread];
}
