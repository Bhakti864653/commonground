"use client";

import { CheckCircle2, MapPin } from "lucide-react";
import { renderCategoryIcon } from "@/components/icons/category-icon-map";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import { STATUS_LABELS, VERIFICATION_LABELS, type Case } from "@/lib/schema/report";
import type { CategoryConfig } from "@/lib/schema/community";

export function CaseView({
  caseData,
  category,
  communityDisplayName,
  isNew,
}: {
  caseData: Case;
  category: CategoryConfig;
  communityDisplayName: string;
  isNew: boolean;
}) {
  const { language } = useLanguage();
  const t = UI_STRINGS.caseDetail;
  const statusLabel = STATUS_LABELS[caseData.status][language];
  const verificationLabel = VERIFICATION_LABELS[caseData.verificationState][language];
  const typeLabel =
    caseData.type === "report"
      ? UI_STRINGS.reportFlow.typeStep.report.title[language]
      : UI_STRINGS.reportFlow.typeStep.proposal.title[language];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 md:px-8">
      {isNew && (
        <div className="flex items-start gap-2 rounded-lg border border-teal/30 bg-mint/50 p-4 text-sm text-ink">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
          <p>{t.confirmationBanner[language]}</p>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-slate">{t.heading[language]}</p>
        <h1 className="text-2xl font-semibold text-ink md:text-3xl">
          {caseData.publicCaseNumber}
        </h1>
      </div>

      <section className="rounded-lg border border-ink/10 p-4">
        <div className="flex items-center gap-2">
          {renderCategoryIcon(category.icon, { className: "h-5 w-5 text-teal" })}
          <p className="font-medium text-ink">
            {language === "es" ? category.labelEs : category.label}
          </p>
          <span className="ml-auto rounded-full bg-mint px-2.5 py-0.5 text-xs font-medium text-teal">
            {typeLabel}
          </span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-ink/90">{caseData.description}</p>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-slate">
          <MapPin aria-hidden="true" className="h-4 w-4" />
          {formatApproximateAreaLabel(caseData.approximateArea, language)}
        </p>
        <p className="mt-1 text-xs text-slate">{communityDisplayName}</p>
      </section>

      <section className="rounded-lg border border-ink/10 bg-mint/30 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
          {t.statusHeading[language]}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Every case is "received" until Phase 4 adds real status transitions — a
              status->color mapping belongs there, once other statuses can actually occur. */}
          <span className="rounded-full bg-yellow/50 px-3 py-1 text-sm font-medium text-ink">
            {statusLabel}
          </span>
          <span className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium text-slate">
            {verificationLabel}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate">
          {t.submittedOn[language]}{" "}
          {new Date(caseData.createdAt).toLocaleDateString(language === "es" ? "es-PA" : "en-US")}
        </p>
      </section>

      <p className="text-xs text-slate">{t.noGuaranteeNote[language]}</p>
    </div>
  );
}
