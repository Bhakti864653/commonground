"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, isTheme, type Theme } from "./theme";

/**
 * The source of truth is the `data-theme` attribute on <html> (set before paint by
 * THEME_INIT_SCRIPT), not React state — so every component reading it, plus the CSS itself,
 * always agrees, and there's no setState-in-effect sync step.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getSnapshot(): Theme | null {
  const value = document.documentElement.getAttribute("data-theme");
  return isTheme(value) ? value : null;
}

/** The server can't know the visitor's theme; null means "not known yet" during hydration. */
function getServerSnapshot(): Theme | null {
  return null;
}

export function useTheme(): { theme: Theme | null; setTheme: (theme: Theme) => void } {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private window, blocked site data) — the choice still applies for
      // this page view, it just won't be remembered.
    }
  }, []);

  return { theme, setTheme };
}
