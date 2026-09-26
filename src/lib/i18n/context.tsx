"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { COMMUNITIES } from "@/data/communities";
import { pickBrowserLanguage, resolveInitialLanguage } from "./resolve-initial-language";
import type { Language } from "./dictionary";
import { htmlLang } from "./languages";

const DEFAULT_LANGUAGE: Language = resolveInitialLanguage(COMMUNITIES[0]);

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

// The browser's language list doesn't change while the page is open, so there is nothing to
// subscribe to; useSyncExternalStore is used only so the server render (null) and the first
// client render agree, with the browser's language applied right after hydration.
const subscribeNever = () => () => {};
const readBrowserLanguage = () =>
  pickBrowserLanguage(typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]));
const serverBrowserLanguage = () => null;

/**
 * In-memory only — see the matching note on CommunityProvider. A visitor starts in their own
 * browser language when CommonGround speaks it (someone in Canada with an English or French
 * browser doesn't land on a Spanish page), otherwise in the pilot community's default. Picking a
 * language from the menu always wins.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<Language | null>(null);
  const browserLanguage = useSyncExternalStore(subscribeNever, readBrowserLanguage, serverBrowserLanguage);
  const language = chosen ?? browserLanguage ?? DEFAULT_LANGUAGE;

  // Keep <html lang> in sync so screen readers pronounce the right language and CSS :lang()
  // rules (e.g. Chinese typography) apply.
  useEffect(() => {
    document.documentElement.lang = htmlLang(language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({ language, setLanguage: setChosen }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
