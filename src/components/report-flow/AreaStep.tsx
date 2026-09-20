"use client";

import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import type { AreaConfig } from "@/lib/schema/community";

/** `value` is either a real area's id or the literal "prefer_not_to_say" — never free text. */
export function AreaStep({
  areas,
  value,
  onChange,
  language,
}: {
  areas: AreaConfig[];
  value: string | null;
  onChange: (value: string) => void;
  language: Language;
}) {
  const t = UI_STRINGS.reportFlow.areaStep;

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-ink">{t.heading[language]}</legend>
      <p className="mt-1 text-sm text-slate">{t.subheading[language]}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {areas.map((area) => {
          const selected = value === area.id;
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => onChange(area.id)}
              aria-pressed={selected}
              className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                selected
                  ? "border-teal bg-mint/60 text-ink"
                  : "border-ink/15 text-ink hover:bg-mint/20"
              }`}
            >
              {language === "es" ? area.labelEs : area.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange("prefer_not_to_say")}
          aria-pressed={value === "prefer_not_to_say"}
          className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
            value === "prefer_not_to_say"
              ? "border-teal bg-mint/60 text-ink"
              : "border-ink/15 text-slate hover:bg-mint/20"
          }`}
        >
          {t.preferNotToSay[language]}
        </button>
      </div>
    </fieldset>
  );
}
