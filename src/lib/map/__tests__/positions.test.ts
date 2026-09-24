import { describe, expect, it } from "vitest";
import { NO_AREA_POSITION, mapAreaPosition, mapPinPosition } from "@/lib/map/positions";

describe("mapAreaPosition", () => {
  it("places compass-named areas where a resident would expect", () => {
    const [nx, ny] = mapAreaPosition("norte", 1, 5);
    const [sx, sy] = mapAreaPosition("sur", 2, 5);
    const [ex] = mapAreaPosition("este", 3, 5);
    const [ox] = mapAreaPosition("oeste", 4, 5);
    expect(ny).toBeLessThan(sy);
    expect(ex).toBeGreaterThan(ox);
    expect(nx).toBeGreaterThan(0);
    expect(sx).toBeGreaterThan(0);
  });

  it("spreads unknown area ids evenly inside the map", () => {
    for (let i = 0; i < 3; i++) {
      const [x, y] = mapAreaPosition(`area-${i}`, i, 3);
      expect(x).toBeGreaterThan(5);
      expect(x).toBeLessThan(95);
      expect(y).toBeGreaterThan(30);
      expect(y).toBeLessThan(90);
    }
  });
});

describe("mapPinPosition", () => {
  it("is stable for the same area and order", () => {
    expect(mapPinPosition("norte", 1, 5, 2)).toEqual(mapPinPosition("norte", 1, 5, 2));
  });

  it("never stacks pins that share an area", () => {
    const spots = Array.from({ length: 8 }, (_, i) => mapPinPosition("norte", 1, 5, i).join(","));
    expect(new Set(spots).size).toBe(8);
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        const [ax, ay] = mapPinPosition("norte", 1, 5, i);
        const [bx, by] = mapPinPosition("norte", 1, 5, j);
        expect(Math.hypot(ax - bx, ay - by)).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it("stays near its area rather than pinpointing a location", () => {
    const [ax, ay] = mapAreaPosition("sur", 2, 5);
    for (let i = 0; i < 5; i++) {
      const [x, y] = mapPinPosition("sur", 2, 5, i);
      expect(Math.abs(x - ax)).toBeLessThanOrEqual(14);
      expect(Math.abs(y - (ay + 8))).toBeLessThanOrEqual(10);
    }
  });

  it("keeps pins inside the map and below the title block", () => {
    for (let i = 0; i < 12; i++) {
      const [x, y] = mapPinPosition("norte", 1, 5, i);
      expect(x).toBeGreaterThanOrEqual(8);
      expect(x).toBeLessThanOrEqual(92);
      expect(y).toBeGreaterThanOrEqual(32);
      expect(y).toBeLessThanOrEqual(86);
    }
  });

  it("puts cases with no area in their own corner", () => {
    const [x] = mapPinPosition(null, -1, 5, 0);
    expect(x).toBe(NO_AREA_POSITION[0]);
  });
});
