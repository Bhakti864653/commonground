"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { renderCategoryIcon } from "@/components/icons/category-icon-map";
import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import { formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import { STATUS_LABELS, type Case } from "@/lib/schema/report";
import type { CategoryConfig } from "@/lib/schema/community";

/**
 * DESIGN_SYSTEM.md's required card fields: title, category, approximate area, date, status,
 * source type, case number — never a like/follower/ranking count of any kind.
 */
export function CaseCard({
  caseItem,
  category,
  language,
}: {
  caseItem: Case;
  category: CategoryConfig;
  language: Language;
}) {
  const typeLabel =
    caseItem.type === "report"
      ? UI_STRINGS.reportFlow.typeStep.report.title[language]
      : UI_STRINGS.reportFlow.typeStep.proposal.title[language];

  return (
    <Link
      href={`/cases/${caseItem.publicCaseNumber}`}
      className="flex flex-col gap-2 rounded-lg border border-ink/10 p-4 transition-colors hover:bg-mint/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
    >
      <div className="flex items-center gap-2">
        {renderCategoryIcon(category.icon, { className: "h-4 w-4 shrink-0 text-teal" })}
        <p className="font-medium text-ink">
          {language === "es" ? category.labelEs : category.label}
        </p>
        <span className="ml-auto shrink-0 rounded-full bg-mint px-2 py-0.5 text-[11px] font-medium text-teal">
          {typeLabel}
        </span>
      </div>
      <p className="line-clamp-2 text-sm text-ink/80">{caseItem.description}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate">
        <span className="flex items-center gap-1">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
          {formatApproximateAreaLabel(caseItem.approximateArea, language)}
        </span>
        <span>{new Date(caseItem.createdAt).toLocaleDateString(language === "es" ? "es-PA" : "en-US")}</span>
        <span className="rounded-full bg-yellow/50 px-2 py-0.5 font-medium text-ink">
          {STATUS_LABELS[caseItem.status][language]}
        </span>
        <span className="font-mono">{caseItem.publicCaseNumber}</span>
      </div>
    </Link>
  );
}
