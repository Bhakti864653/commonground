import { describe, expect, it } from "vitest";
import {
  ISLAND_RADIUS,
  UNASSIGNED_POSITION,
  areaPosition,
  currentStage,
  markerPosition,
  neighborhoodFor,
  stagesReached,
  toSvg,
} from "@/lib/landscape/layout";

const distance = ([x, z]: [number, number]) => Math.hypot(x, z);

describe("areaPosition", () => {
  it("places compass-named areas where a resident would expect them", () => {
    expect(areaPosition("centro", 0, 5)).toEqual([0, 0]);
    expect(areaPosition("norte", 1, 5)[1]).toBeLessThan(-4); // north = toward -z (away from camera)
    expect(areaPosition("sur", 2, 5)[1]).toBeGreaterThan(4);
    expect(areaPosition("este", 3, 5)[0]).toBeGreaterThan(4);
    expect(areaPosition("oeste", 4, 5)[0]).toBeLessThan(-4);
  });

  it("falls back to an even ring for area ids it doesn't know", () => {
    const a = areaPosition("riverside", 0, 4);
    const b = areaPosition("hillside", 2, 4);
    expect(distance(a)).toBeCloseTo(5.2);
    expect(a[0]).toBeCloseTo(-b[0]);
    expect(a[1]).toBeCloseTo(-b[1]);
  });

  it("keeps every area inside the island", () => {
    for (const id of ["centro", "norte", "sur", "este", "oeste", "x", "y"]) {
      expect(distance(areaPosition(id, 1, 3))).toBeLessThan(ISLAND_RADIUS - 2);
    }
    expect(distance(UNASSIGNED_POSITION)).toBeLessThan(ISLAND_RADIUS - 1);
  });
});

describe("markerPosition", () => {
  it("is deterministic for the same case", () => {
    expect(markerPosition("case-1", [0, 0])).toEqual(markerPosition("case-1", [0, 0]));
  });

  it("stays within its area rather than pinpointing a location", () => {
    for (const id of ["a", "b", "case-123", "zzz"]) {
      const [x, z] = markerPosition(id, [5, 5]);
      expect(Math.abs(x - 5)).toBeLessThanOrEqual(1.35);
      expect(Math.abs(z - 5)).toBeLessThanOrEqual(1.35);
    }
  });
});

describe("neighborhoodFor", () => {
  it("grows the same neighborhood every time for the same area", () => {
    expect(neighborhoodFor("norte", [0, -5])).toEqual(neighborhoodFor("norte", [0, -5]));
  });

  it("keeps houses clear of the area's middle, where markers stand", () => {
    const { houses } = neighborhoodFor("sur", [0, 5]);
    expect(houses).toHaveLength(7);
    for (const house of houses) {
      expect(Math.hypot(house.position[0], house.position[1] - 5)).toBeGreaterThan(1.8);
    }
  });
});

describe("stages", () => {
  it("counts only stages actually reached", () => {
    expect(stagesReached("received")).toBe(1);
    expect(stagesReached("in_discussion")).toBe(3);
    expect(stagesReached("closed")).toBe(5);
  });

  it("never reports a stage beyond what the status reached", () => {
    expect(currentStage("received")).toBe("observed");
    expect(currentStage("not_verifiable")).toBe("reviewed");
    expect(currentStage("updated")).toBe("updated");
  });
});

describe("toSvg", () => {
  it("maps the landscape origin to the center of the drawing", () => {
    expect(toSvg([0, 0], 400)).toEqual([200, 200]);
  });

  it("keeps the whole island inside the viewBox", () => {
    const [left] = toSvg([-ISLAND_RADIUS, 0], 400);
    const [right] = toSvg([ISLAND_RADIUS, 0], 400);
    expect(left).toBeGreaterThan(0);
    expect(right).toBeLessThan(400);
  });
});
