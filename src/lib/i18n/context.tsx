"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { COMMUNITIES } from "@/data/communities";
import { resolveInitialLanguage } from "./resolve-initial-language";
import type { Language } from "./dictionary";

const DEFAULT_LANGUAGE: Language = resolveInitialLanguage(COMMUNITIES[0]);

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** In-memory only — see the matching note on CommunityProvider. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  const value = useMemo<LanguageContextValue>(() => ({ language, setLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
