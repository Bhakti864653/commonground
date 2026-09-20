import { describe, expect, it } from "vitest";
import { buildConsentRecord } from "@/lib/privacy/consent";

describe("buildConsentRecord", () => {
  it("carries the exact consent version and language the resident agreed to", () => {
    const record = buildConsentRecord("2026-09-19.v1", "es", () => "2026-09-20T00:00:00.000Z");
    expect(record).toEqual({
      consentVersion: "2026-09-19.v1",
      consentedAt: "2026-09-20T00:00:00.000Z",
      language: "es",
    });
  });
});
