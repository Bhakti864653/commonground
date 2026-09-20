import { describe, expect, it } from "vitest";
import { resolveInitialLanguage } from "@/lib/i18n/resolve-initial-language";
import { SANTIAGO_VERAGUAS, RIVERBEND_DEMO } from "@/data/communities";

describe("resolveInitialLanguage", () => {
  it("uses the community's own default language when it is supported", () => {
    expect(resolveInitialLanguage(SANTIAGO_VERAGUAS)).toBe("es");
    expect(resolveInitialLanguage(RIVERBEND_DEMO)).toBe("en");
  });

  it("falls back to the first supported language if defaultLanguage isn't in supportedLanguages", () => {
    const malformed = {
      ...SANTIAGO_VERAGUAS,
      defaultLanguage: "en" as const,
      supportedLanguages: ["es" as const],
    };
    expect(resolveInitialLanguage(malformed)).toBe("es");
  });
});
