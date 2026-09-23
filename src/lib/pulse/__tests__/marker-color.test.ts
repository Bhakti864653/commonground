import { describe, expect, it } from "vitest";
import { markerColorForCase } from "@/lib/pulse/marker-color";

describe("markerColorForCase", () => {
  it("colors every proposal teal, regardless of status", () => {
    expect(markerColorForCase({ type: "proposal", status: "closed" })).toBe("#1f8f84");
  });

  it("colors an under-review report yellow", () => {
    expect(markerColorForCase({ type: "report", status: "under_review" })).toBe("#f2b92a");
    expect(markerColorForCase({ type: "report", status: "received" })).toBe("#f2b92a");
  });

  it("falls back to a neutral color for everything else, never coral", () => {
    const colors = (
      ["referred", "in_progress", "updated", "closed", "not_verifiable"] as const
    ).map((status) => markerColorForCase({ type: "report", status }));
    expect(colors.every((c) => c === "#56665f")).toBe(true);
    expect(colors).not.toContain("#b04d38"); // coral — never assigned automatically
  });

  it("uses the dark theme's matching colors when asked, keeping the same meanings", () => {
    expect(markerColorForCase({ type: "proposal", status: "closed" }, "dark")).toBe("#45c9bb");
    expect(markerColorForCase({ type: "report", status: "under_review" }, "dark")).toBe("#f0c75a");
    expect(markerColorForCase({ type: "report", status: "closed" }, "dark")).toBe("#9db0a8");
  });
});
