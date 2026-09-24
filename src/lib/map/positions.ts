/**
 * Percent positions on the illustrative community map. Areas named by compass direction sit
 * where a resident would expect; anything else is spread evenly. A pin's position comes only
 * from its approximate area and its order among that area's cases — never a real location.
 */
const COMPASS: Record<string, [number, number]> = {
  centro: [47, 55],
  norte: [60, 36],
  sur: [36, 76],
  este: [80, 53],
  oeste: [19, 50],
};

/** Cases whose resident preferred not to give an area gather in their own corner. */
export const NO_AREA_POSITION: [number, number] = [86, 34];

const X_RANGE: [number, number] = [8, 92];
const Y_RANGE: [number, number] = [32, 86];

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function mapAreaPosition(areaId: string, index: number, total: number): [number, number] {
  const known = COMPASS[areaId];
  if (known) return known;
  if (total <= 0) return [50, 58];
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return [round1(50 + Math.cos(angle) * 30), round1(59 + Math.sin(angle) * 20)];
}

/**
 * Pins that share an area fan out in a fixed pattern (by their order within that area) so none
 * hides another; the pattern says nothing about where within the area a case is.
 */
const CLUSTER: [number, number][] = [
  [0, 0],
  [7, -4],
  [-7, 4],
  [7, 6],
  [-7, -6],
  [0, 10],
  [14, 1],
  [-14, -1],
];

export function mapPinPosition(areaId: string | null, areaIndex: number, totalAreas: number, orderInArea: number): [number, number] {
  const [ax, ay] = areaId && areaIndex >= 0 ? mapAreaPosition(areaId, areaIndex, totalAreas) : NO_AREA_POSITION;
  const [dx, dy] = CLUSTER[orderInArea % CLUSTER.length];
  const ring = Math.floor(orderInArea / CLUSTER.length); // beyond 8 pins, step outward
  // Pins sit a little below their area's label so the label stays readable.
  return [round1(clamp(ax + dx + ring * 3, X_RANGE)), round1(clamp(ay + 8 + dy + ring * 3, Y_RANGE))];
}
