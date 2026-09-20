import { describe, expect, it } from "vitest";
import { markerColorForCase } from "@/lib/pulse/marker-color";

describe("markerColorForCase", () => {
  it("colors every proposal teal, regardless of status", () => {
    expect(markerColorForCase({ type: "proposal", status: "closed" })).toBe("#167d78");
  });

  it("colors an under-review report yellow", () => {
    expect(markerColorForCase({ type: "report", status: "under_review" })).toBe("#f4c95d");
    expect(markerColorForCase({ type: "report", status: "received" })).toBe("#f4c95d");
  });

  it("falls back to a neutral color for everything else, never coral", () => {
    const colors = (
      ["referred", "in_progress", "updated", "closed", "not_verifiable"] as const
    ).map((status) => markerColorForCase({ type: "report", status }));
    expect(colors.every((c) => c === "#65727d")).toBe(true);
    expect(colors).not.toContain("#d96555"); // coral — never assigned automatically
  });
});
