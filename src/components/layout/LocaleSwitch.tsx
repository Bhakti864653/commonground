"use client";

import { ChevronDown, Languages as LanguagesIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { LANGUAGES, isLanguage } from "@/lib/i18n/languages";

/**
 * The language picker. Five languages don't fit a segmented toggle, so it's a native select —
 * each option written in its own language, so anyone can find theirs. `onDark` for the sidebar.
 */
export function LocaleSwitch({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <label className={`relative inline-flex shrink-0 items-center ${className ?? ""}`}>
      <span className="sr-only">{FIELD.shell.languageLabel[language]}</span>
      <LanguagesIcon
        aria-hidden="true"
        className={`pointer-events-none absolute left-2.5 h-3.5 w-3.5 ${onDark ? "text-sidebar-text" : "text-ink/70"}`}
      />
      <select
        value={language}
        onChange={(e) => {
          if (isLanguage(e.target.value)) setLanguage(e.target.value);
        }}
        className={`w-full appearance-none rounded-full border py-1.5 pl-7 pr-7 text-xs font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          onDark
            ? "border-sidebar-text/30 bg-sidebar text-sidebar-text focus-visible:outline-lime"
            : "border-line bg-transparent text-ink focus-visible:outline-teal"
        }`}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.htmlLang}>
            {l.nativeName}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute right-2 h-3.5 w-3.5 ${onDark ? "text-sidebar-text" : "text-ink/70"}`}
      />
    </label>
  );
}
