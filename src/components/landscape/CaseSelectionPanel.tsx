"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { renderCategoryIcon } from "@/components/icons/category-icon-map";
import { EXPERIENCE } from "@/lib/i18n/experience";
import type { Language } from "@/lib/i18n/dictionary";
import { formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import { VERIFICATION_LABELS, type PublicCase } from "@/lib/schema/report";
import type { CommunityConfig } from "@/lib/schema/community";
import { StageMeter } from "@/components/journey/StageMeter";
import { StatusPill, VerificationPill } from "@/components/journey/Pills";

/**
 * What a selected landscape marker reveals — exactly the five things the marker stands for:
 * type, approximate area, verification state, current stage, and source. Never a precise
 * location, never who sent it.
 */
export function CaseSelectionPanel({
  caseItem,
  community,
  language,
  onClose,
}: {
  caseItem: PublicCase;
  community: CommunityConfig;
  language: Language;
  onClose: () => void;
}) {
  const t = EXPERIENCE.selection;
  const category = community.categories.find((c) => c.id === caseItem.categoryId);
  const typeLabel = EXPERIENCE.landscape.markerLegend[caseItem.type][language];

  return (
    <section
      aria-label={t.heading[language]}
      className="cg-arrive flex flex-col gap-4 rounded-2xl border border-ink/10 bg-surface p-5 shadow-[0_18px_40px_-24px_rgba(19,38,31,0.45)]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-teal">
          {category && renderCategoryIcon(category.icon, { className: "h-4.5 w-4.5" })}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate">{typeLabel}</p>
          <h3 className="text-lg text-ink">{(language === "es" ? category?.labelEs : category?.label) ?? ""}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 -mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-slate hover:bg-mint hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
          {t.close[language]}
        </button>
      </div>

      <p className="line-clamp-3 text-sm text-ink/85">{caseItem.description}</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-slate">{t.area[language]}</dt>
          <dd className="font-medium text-ink">{formatApproximateAreaLabel(caseItem.approximateArea, language)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate">{t.source[language]}</dt>
          <dd className="font-medium text-ink">
            {caseItem.sourceType === "demonstration" ? t.sourceDemonstration[language] : t.sourceCommunity[language]}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate">{t.verification[language]}</dt>
          <dd>
            <VerificationPill state={caseItem.verificationState} language={language} />
            <span className="sr-only">{VERIFICATION_LABELS[caseItem.verificationState][language]}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate">{t.stage[language]}</dt>
          <dd>
            <StatusPill status={caseItem.status} language={language} />
          </dd>
        </div>
      </dl>

      <StageMeter status={caseItem.status} language={language} />

      <Link
        href={`/cases/${caseItem.publicCaseNumber}`}
        className="self-start rounded-full bg-teal px-4 py-2 text-sm font-medium text-cream hover:bg-teal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        {t.open[language]} {caseItem.publicCaseNumber}
      </Link>
    </section>
  );
}
