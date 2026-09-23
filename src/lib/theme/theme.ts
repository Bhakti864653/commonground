export type Theme = "light" | "dark";

/** Only the visitor's own explicit choice is stored. */
export const THEME_STORAGE_KEY = "commonground-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Light is the default for everyone; dark applies only when the visitor has explicitly chosen
 * it. A corrupted or unexpected stored value is ignored rather than trusted.
 */
export function resolveTheme(stored: unknown): Theme {
  return isTheme(stored) ? stored : "light";
}

/**
 * Runs inline in <head> before the first paint, so a visitor who chose dark never sees a flash
 * of the light page first. It has to be a plain string (it runs before React or any bundle
 * loads), so it repeats `resolveTheme`'s rule by hand — keep the two in sync.
 * localStorage can throw (private windows, blocked storage), so it falls back to light.
 */
export const THEME_INIT_SCRIPT = `(function(){var t="light";try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(s==="light"||s==="dark")t=s}catch(e){}document.documentElement.setAttribute("data-theme",t)})();`;
