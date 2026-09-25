import type { MapDirection, MapSettings } from "@/lib/schema/community";

/**
 * Geometry for the real street map. A zone is a soft circle standing for a whole configured
 * area — placed from the community's public center point and the direction its configurer gave
 * it, never from anything a resident entered. Areas without a direction have no honest place on
 * real streets, so they are not drawn (the map lists their cases separately instead).
 */
export type LngLat = [number, number];

const KM_PER_DEG_LAT = 110.574;
const kmPerDegLng = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);

/** Offsets in units of the community radius: [east, north]. */
const DIRECTION_OFFSETS: Record<MapDirection, [number, number]> = {
  center: [0, 0],
  north: [0, 0.62],
  south: [0, -0.62],
  east: [0.62, 0],
  west: [-0.62, 0],
};

/** Each zone's radius as a share of the community radius — zones sit close but never overlap. */
export const ZONE_RADIUS_SHARE = 0.28;

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

function offsetKm([lng, lat]: LngLat, eastKm: number, northKm: number): LngLat {
  return [round6(lng + eastKm / kmPerDegLng(lat)), round6(lat + northKm / KM_PER_DEG_LAT)];
}

/** The center of an area's zone, or null when the area has no direction. */
export function zoneCenter(direction: MapDirection | undefined, map: MapSettings): LngLat | null {
  if (!direction) return null;
  const offset = DIRECTION_OFFSETS[direction];
  return offsetKm([map.center.lng, map.center.lat], offset[0] * map.radiusKm, offset[1] * map.radiusKm);
}

export function zoneRadiusKm(map: MapSettings): number {
  return map.radiusKm * ZONE_RADIUS_SHARE;
}

/** A closed ring approximating a circle, for a GeoJSON polygon. */
export function circleRing(center: LngLat, radiusKm: number, steps = 48): LngLat[] {
  const ring: LngLat[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ring.push(offsetKm(center, Math.cos(a) * radiusKm, Math.sin(a) * radiusKm));
  }
  ring.push(ring[0]);
  return ring;
}

/** The view that shows every zone: [[west, south], [east, north]]. */
export function communityBounds(map: MapSettings): [LngLat, LngLat] {
  const reach = map.radiusKm * (0.62 + ZONE_RADIUS_SHARE) * 1.08;
  const origin: LngLat = [map.center.lng, map.center.lat];
  return [offsetKm(origin, -reach, -reach), offsetKm(origin, reach, reach)];
}
