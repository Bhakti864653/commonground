"use client";

import { getCategoryIcon } from "@/components/icons/category-icon-map";
import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import type { CategoryConfig } from "@/lib/schema/community";

export function CategoryStep({
  categories,
  value,
  onChange,
  language,
}: {
  categories: CategoryConfig[];
  value: string | null;
  onChange: (categoryId: string) => void;
  language: Language;
}) {
  const t = UI_STRINGS.reportFlow.categoryStep;

  return (
    <fieldset>
      <legend className="text-lg font-semibold text-ink">{t.heading[language]}</legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.icon);
          const selected = value === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              aria-pressed={selected}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                selected ? "border-teal bg-mint/60" : "border-ink/15 hover:bg-mint/20"
              }`}
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-teal" />
              <span className="font-medium text-ink">
                {language === "es" ? category.labelEs : category.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
