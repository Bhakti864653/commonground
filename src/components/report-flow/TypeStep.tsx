"use client";

import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";

export function TypeStep({
  value,
  onChange,
  language,
}: {
  value: "report" | "proposal" | null;
  onChange: (value: "report" | "proposal") => void;
  language: Language;
}) {
  const t = UI_STRINGS.reportFlow.typeStep;
  const options = [
    { key: "report" as const, ...t.report },
    { key: "proposal" as const, ...t.proposal },
  ];

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-ink">{t.heading[language]}</legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={value === opt.key}
            className={`rounded-lg border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
              value === opt.key ? "border-teal bg-mint/60" : "border-ink/15 hover:bg-mint/20"
            }`}
          >
            <p className="font-semibold text-ink">{opt.title[language]}</p>
            <p className="mt-1 text-sm text-slate">{opt.body[language]}</p>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
