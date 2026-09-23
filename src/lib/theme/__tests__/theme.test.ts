import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY, isTheme, resolveTheme } from "@/lib/theme/theme";

describe("resolveTheme", () => {
  it("uses an explicit stored choice over the system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the system when nothing is stored", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it("ignores a corrupted stored value instead of trusting it", () => {
    expect(resolveTheme("purple", true)).toBe("dark");
    expect(resolveTheme("", false)).toBe("light");
    expect(resolveTheme(42, false)).toBe("light");
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

  function runScript(systemPrefersDark: boolean) {
    // jsdom doesn't implement matchMedia at all, so stub it rather than spy on it.
    vi.stubGlobal("matchMedia", () => ({ matches: systemPrefersDark }) as MediaQueryList);
    new Function(THEME_INIT_SCRIPT)();
    return document.documentElement.getAttribute("data-theme");
  }

  it.each([
    [null, true],
    [null, false],
    ["light", true],
    ["dark", false],
    ["purple", true],
  ])("matches resolveTheme for stored=%s, systemPrefersDark=%s", (stored, systemPrefersDark) => {
    if (stored !== null) localStorage.setItem(THEME_STORAGE_KEY, stored);
    expect(runScript(systemPrefersDark)).toBe(resolveTheme(stored, systemPrefersDark));
  });

  it("still applies the system theme when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(runScript(true)).toBe("dark");
  });
});
