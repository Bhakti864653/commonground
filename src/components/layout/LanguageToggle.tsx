"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => setLanguage(language === "es" ? "en" : "es")}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink/15 px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${className ?? ""}`}
    >
      <Languages aria-hidden="true" className="h-4 w-4" />
      {UI_STRINGS.languageToggle[language]}
    </button>
  );
}
