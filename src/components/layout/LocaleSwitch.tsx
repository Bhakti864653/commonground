"use client";

import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";

/** EN / ES segmented switch from the reference. `onDark` for the sidebar. */
export function LocaleSwitch({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  const { language, setLanguage } = useLanguage();
  const options = [
    { value: "es" as const, label: "ES", name: "Español" },
    { value: "en" as const, label: "EN", name: "English" },
  ];
  return (
    <div
      role="group"
      aria-label={FIELD.shell.languageLabel[language]}
      className={`flex gap-1 rounded-full border p-1 ${onDark ? "border-sidebar-text/30" : "border-line"} ${className ?? ""}`}
    >
      {options.map((option) => {
        const active = language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.value}
            aria-label={option.name}
            aria-pressed={active}
            onClick={() => setLanguage(option.value)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${
              active ? "bg-lime text-[#172b25]" : onDark ? "text-sidebar-text hover:text-white" : "text-ink/70 hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
