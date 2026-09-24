"use client";

import { getCategoryIcon } from "@/components/icons/category-icon-map";
import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import type { CategoryConfig } from "@/lib/schema/community";
import { labelOf } from "@/lib/i18n/labels";

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
      <legend className="font-heading text-[1.9rem] leading-tight tracking-[-0.05em] text-ink md:text-[2.2rem]">{t.heading[language]}</legend>
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
              className={`flex items-center gap-3 rounded-[15px] border p-[18px] text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                selected ? "border-forest bg-lime/45" : "border-line bg-surface hover:bg-mint/60"
              }`}
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-teal" />
              <span className="font-medium text-ink">
                {labelOf(category, language)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
