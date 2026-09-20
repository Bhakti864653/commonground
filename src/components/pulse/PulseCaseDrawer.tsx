"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { renderCategoryIcon } from "@/components/icons/category-icon-map";
import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import { formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import { STATUS_LABELS, type Case } from "@/lib/schema/report";
import type { CategoryConfig } from "@/lib/schema/community";

/**
 * A plain HTML panel, not rendered inside the WebGL canvas at all — spec: "Selecting a marker
 * opens a normal HTML detail drawer... so nothing essential is ever locked inside WebGL."
 * Fully reachable by keyboard/screen readers regardless of whether the 3D view rendered.
 */
export function PulseCaseDrawer({
  caseItem,
  category,
  language,
  onClose,
}: {
  caseItem: Case;
  category: CategoryConfig;
  language: Language;
  onClose: () => void;
}) {
  const typeLabel =
    caseItem.type === "report"
      ? UI_STRINGS.reportFlow.typeStep.report.title[language]
      : UI_STRINGS.reportFlow.typeStep.proposal.title[language];

  return (
    <div className="rounded-lg border border-ink/10 bg-cream p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {renderCategoryIcon(category.icon, { className: "h-5 w-5 text-teal" })}
          <p className="font-medium text-ink">
            {language === "es" ? category.labelEs : category.label}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={UI_STRINGS.pulse.closeDetail[language]}
          className="shrink-0 rounded-md p-1 text-slate hover:text-ink"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-sm text-ink/80">{caseItem.description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate">
        <span className="rounded-full bg-mint px-2 py-0.5 font-medium text-teal">{typeLabel}</span>
        <span>{formatApproximateAreaLabel(caseItem.approximateArea, language)}</span>
        <span className="rounded-full bg-yellow/50 px-2 py-0.5 font-medium text-ink">
          {STATUS_LABELS[caseItem.status][language]}
        </span>
        <span className="font-mono">{caseItem.publicCaseNumber}</span>
      </div>
      <Link
        href={`/cases/${caseItem.publicCaseNumber}`}
        className="mt-3 inline-block text-sm font-medium text-teal underline"
      >
        {UI_STRINGS.caseDetail.heading[language]} →
      </Link>
    </div>
  );
}
