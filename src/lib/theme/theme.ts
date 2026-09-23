export type Theme = "light" | "dark";

/** Only the visitor's own explicit choice is stored — never a value derived from the system. */
export const THEME_STORAGE_KEY = "commonground-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * An explicit, valid stored choice always wins; otherwise follow the operating system. A
 * corrupted or unexpected stored value is ignored rather than trusted.
 */
export function resolveTheme(stored: unknown, systemPrefersDark: boolean): Theme {
  if (isTheme(stored)) return stored;
  return systemPrefersDark ? "dark" : "light";
}

/**
 * Runs inline in <head> before the first paint, so a dark-mode visitor never sees a flash of
 * the light page first. It has to be a plain string (it runs before React or any bundle
 * loads), so it repeats `resolveTheme`'s rule by hand — keep the two in sync.
 * localStorage can throw (private windows, blocked storage), so it falls back to the system.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=null;try{s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})}catch(e){}var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`;
