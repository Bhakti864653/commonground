import { describe, expect, it } from "vitest";
import { circleRing, communityBounds, zoneCenter, zoneRadiusKm, type LngLat } from "../geo";
import { SANTIAGO_VERAGUAS } from "@/data/communities/santiago-veraguas";
import { RIVERBEND_DEMO } from "@/data/communities/riverbend-demo";
import { MAP_DIRECTIONS, MapSettingsSchema } from "@/lib/schema/community";

const map = { center: { lat: 8.099, lng: -80.9804 }, radiusKm: 1.6 };
const COMPASS = MAP_DIRECTIONS;

function distanceKm([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

describe("street-map zones", () => {
  it("puts the central area on the community center", () => {
    expect(zoneCenter("center", map)).toEqual([-80.9804, 8.099]);
  });

  it("puts compass areas in their compass direction", () => {
    expect(zoneCenter("north", map)![1]).toBeGreaterThan(map.center.lat);
    expect(zoneCenter("south", map)![1]).toBeLessThan(map.center.lat);
    expect(zoneCenter("east", map)![0]).toBeGreaterThan(map.center.lng);
    expect(zoneCenter("west", map)![0]).toBeLessThan(map.center.lng);
  });

  it("keeps outer zones the same distance from the center", () => {
    for (const id of ["north", "south", "east", "west"] as const) {
      expect(distanceKm([map.center.lng, map.center.lat], zoneCenter(id, map)!)).toBeCloseTo(1.6 * 0.62, 1);
    }
  });

  it("never invents a place for an area without a direction", () => {
    expect(zoneCenter(undefined, map)).toBeNull();
  });

  it("never overlaps two zones", () => {
    const r = zoneRadiusKm(map);
    const centers = COMPASS.map((id) => zoneCenter(id, map)!);
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        expect(distanceKm(centers[i], centers[j])).toBeGreaterThan(2 * r);
      }
    }
  });

  it("builds a closed circle at the requested radius", () => {
    const center = zoneCenter("north", map)!;
    const ring = circleRing(center, 0.5, 24);
    expect(ring).toHaveLength(25);
    expect(ring[0]).toEqual(ring[24]);
    for (const point of ring) expect(distanceKm(center, point)).toBeCloseTo(0.5, 1);
  });

  it("frames every zone inside the community bounds", () => {
    const [[west, south], [east, north]] = communityBounds(map);
    for (const id of COMPASS) {
      for (const [lng, lat] of circleRing(zoneCenter(id, map)!, zoneRadiusKm(map))) {
        expect(lng).toBeGreaterThan(west);
        expect(lng).toBeLessThan(east);
        expect(lat).toBeGreaterThan(south);
        expect(lat).toBeLessThan(north);
      }
    }
  });
});

describe("map settings", () => {
  it("places the pilot community at its real center", () => {
    expect(SANTIAGO_VERAGUAS.map).toEqual(map);
  });

  it("gives each pilot area its own direction", () => {
    const directions = Object.fromEntries(SANTIAGO_VERAGUAS.areas.map((a) => [a.id, a.mapDirection]));
    expect(directions).toEqual({ centro: "center", norte: "north", sur: "south", este: "east", oeste: "west" });
  });

  it("never puts the fictional demo community on a real map", () => {
    expect(RIVERBEND_DEMO.map).toBeUndefined();
  });

  it("rejects impossible coordinates and radii", () => {
    expect(MapSettingsSchema.safeParse({ center: { lat: 91, lng: 0 }, radiusKm: 1 }).success).toBe(false);
    expect(MapSettingsSchema.safeParse({ center: { lat: 0, lng: -181 }, radiusKm: 1 }).success).toBe(false);
    expect(MapSettingsSchema.safeParse({ center: { lat: 0, lng: 0 }, radiusKm: 0 }).success).toBe(false);
    expect(MapSettingsSchema.safeParse({ center: { lat: 0, lng: 0 }, radiusKm: 100 }).success).toBe(false);
  });
});
