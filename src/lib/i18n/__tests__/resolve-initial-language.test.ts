import { describe, expect, it } from "vitest";
import { pickBrowserLanguage, resolveInitialLanguage } from "@/lib/i18n/resolve-initial-language";
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

describe("pickBrowserLanguage", () => {
  it("picks the first supported language in the visitor's order", () => {
    expect(pickBrowserLanguage(["en-CA", "fr-CA"])).toBe("en");
    expect(pickBrowserLanguage(["fr-CA", "en-CA"])).toBe("fr");
    expect(pickBrowserLanguage(["de-DE", "it-IT", "en"])).toBe("it");
    expect(pickBrowserLanguage(["pt-BR"])).toBe("pt");
    expect(pickBrowserLanguage(["hi-IN"])).toBe("hi");
    expect(pickBrowserLanguage(["ES-pa"])).toBe("es");
  });

  it("matches only Simplified Chinese, falling through for Traditional", () => {
    expect(pickBrowserLanguage(["zh-CN"])).toBe("zh");
    expect(pickBrowserLanguage(["zh-Hans-CN"])).toBe("zh");
    expect(pickBrowserLanguage(["zh"])).toBe("zh");
    expect(pickBrowserLanguage(["zh-TW", "en-US"])).toBe("en");
    expect(pickBrowserLanguage(["zh-Hant-HK"])).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(pickBrowserLanguage([])).toBeNull();
    expect(pickBrowserLanguage(["de-DE", "ja"])).toBeNull();
  });
});
