import { describe, expect, it } from "vitest";
import { relativeTime } from "@/lib/agent/relative-time";

const NOW = new Date("2026-10-05T12:00:00Z");
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString();

describe("relativeTime", () => {
  it("says how long ago, in the visitor's language", () => {
    expect(relativeTime(ago(5 * 60), NOW, "es-PA")).toBe("hace 5 min");
    expect(relativeTime(ago(5 * 60), NOW, "en-US")).toMatch(/^5 min/);
    expect(relativeTime(ago(3 * 3600), NOW, "es-PA")).toMatch(/^hace 3 h/);
    expect(relativeTime(ago(2 * 86400), NOW, "es-PA")).toBe("anteayer");
    expect(relativeTime(ago(9 * 86400), NOW, "en-US")).toMatch(/^last w/);
  });

  it("calls anything under a minute 'now'", () => {
    expect(relativeTime(ago(20), NOW, "es-PA")).toBe("ahora");
    expect(relativeTime(ago(20), NOW, "en-US")).toBe("now");
  });
});
