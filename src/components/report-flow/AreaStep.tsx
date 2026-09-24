"use client";

import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import type { AreaConfig } from "@/lib/schema/community";
import { labelOf } from "@/lib/i18n/labels";

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
      <legend className="font-heading text-[1.9rem] leading-tight tracking-[-0.05em] text-ink md:text-[2.2rem]">{t.heading[language]}</legend>
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
              className={`rounded-[15px] border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                selected
                  ? "border-forest bg-lime/45 text-ink"
                  : "border-line bg-surface text-ink hover:bg-mint/60"
              }`}
            >
              {labelOf(area, language)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange("prefer_not_to_say")}
          aria-pressed={value === "prefer_not_to_say"}
          className={`rounded-[15px] border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
            value === "prefer_not_to_say"
              ? "border-forest bg-lime/45 text-ink"
              : "border-line bg-surface text-slate hover:bg-mint/60"
          }`}
        >
          {t.preferNotToSay[language]}
        </button>
      </div>
    </fieldset>
  );
}
