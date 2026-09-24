"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { renderCategoryIcon } from "@/components/icons/category-icon-map";
import { FIELD } from "@/lib/i18n/field-notes";
import type { Language } from "@/lib/i18n/dictionary";
import { formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import type { PublicCase } from "@/lib/schema/report";
import type { CategoryConfig } from "@/lib/schema/community";
import { StatusPill } from "./Pills";
import { labelOf } from "@/lib/i18n/labels";

/**
 * One row of the public record, as in the reference: a numbered category mark (the number
 * matches the case's pin on the map), what was observed, its case number and type, the
 * approximate area, and its status. Never a like/follower/ranking count of any kind.
 */
export function CaseRow({
  caseItem,
  index,
  category,
  language,
}: {
  caseItem: PublicCase;
  index: number;
  category: CategoryConfig | undefined;
  language: Language;
}) {
  const typeLabel = FIELD.explore[caseItem.type][language];
  const categoryLabel = labelOf(category, language) ?? "";
  const area = formatApproximateAreaLabel(caseItem.approximateArea, language);

  return (
    <li className="border-b border-line">
      <Link
        href={`/cases/${caseItem.publicCaseNumber}`}
        className="grid grid-cols-[48px_minmax(0,1fr)_22px] items-center gap-3 px-1 py-5 transition-colors hover:bg-mint/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal md:grid-cols-[65px_minmax(0,1.4fr)_minmax(110px,0.5fr)_minmax(130px,0.5fr)_28px] md:gap-4 md:py-[23px]"
      >
        <span aria-hidden="true" className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full bg-mint text-ink md:h-[55px] md:w-[55px]">
          <span className="absolute -left-2 -top-2 rounded-full bg-ink px-[5px] py-[3px] text-[0.54rem] font-black tracking-[0.05em] text-paper">
            {String(index + 1).padStart(2, "0")}
          </span>
          {category && renderCategoryIcon(category.icon, { className: "h-5 w-5 md:h-6 md:w-6", strokeWidth: 1.6 })}
        </span>
        <span className="min-w-0">
          <span className="line-clamp-2 font-heading text-[1.2rem] leading-tight tracking-[-0.05em] text-ink md:text-[1.48rem]">
            {caseItem.description}
          </span>
          <span className="mt-1 block text-[0.79rem] text-slate">
            <span className="tabular-nums">{caseItem.publicCaseNumber}</span> · {categoryLabel} · {typeLabel}
          </span>
          <span className="mt-2 flex flex-wrap gap-2 md:hidden">
            <StatusPill status={caseItem.status} language={language} />
          </span>
        </span>
        <span className="hidden text-[0.85rem] text-slate md:block">{area}</span>
        <span className="hidden md:block">
          <StatusPill status={caseItem.status} language={language} />
        </span>
        <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-ink" />
      </Link>
    </li>
  );
}
