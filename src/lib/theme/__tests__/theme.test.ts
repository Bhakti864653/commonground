import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY, isTheme, resolveTheme } from "@/lib/theme/theme";

describe("resolveTheme", () => {
  it("uses an explicit stored choice", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("defaults to light when nothing is stored", () => {
    expect(resolveTheme(null)).toBe("light");
    expect(resolveTheme(undefined)).toBe("light");
  });

  it("ignores a corrupted stored value instead of trusting it", () => {
    expect(resolveTheme("purple")).toBe("light");
    expect(resolveTheme("")).toBe("light");
    expect(resolveTheme(42)).toBe("light");
  });
});

describe("isTheme", () => {
  it("accepts only light and dark", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("Dark")).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

/**
 * The inline <head> script repeats resolveTheme's rule by hand (it runs before any bundle
 * loads), so run the real script string and check it agrees with resolveTheme in every case.
 */
describe("THEME_INIT_SCRIPT", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function runScript() {
    new Function(THEME_INIT_SCRIPT)();
    return document.documentElement.getAttribute("data-theme");
  }

  it.each([[null], ["light"], ["dark"], ["purple"]])("matches resolveTheme for stored=%s", (stored) => {
    if (stored !== null) localStorage.setItem(THEME_STORAGE_KEY, stored);
    expect(runScript()).toBe(resolveTheme(stored));
  });

  it("stays light even when the operating system prefers dark", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }) as MediaQueryList);
    expect(runScript()).toBe("light");
  });

  it("falls back to light when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(runScript()).toBe("light");
  });
});
