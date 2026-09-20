"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { renderCategoryIcon } from "@/components/icons/category-icon-map";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import { VERIFICATION_LABELS, type PublicCase } from "@/lib/schema/report";
import type { CategoryConfig } from "@/lib/schema/community";
import { ActionTrail } from "./ActionTrail";
import { StatusHistoryTimeline } from "./StatusHistoryTimeline";
import { InaccuracyFlagForm } from "./InaccuracyFlagForm";
import { DeleteSubmission } from "./DeleteSubmission";

export function CaseView({
  caseData,
  category,
  communityDisplayName,
  isNew,
  managementToken,
}: {
  caseData: PublicCase;
  category: CategoryConfig;
  communityDisplayName: string;
  isNew: boolean;
  managementToken: string | null;
}) {
  const { language } = useLanguage();
  const t = UI_STRINGS.caseDetail;
  const [deleted, setDeleted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const verificationLabel = VERIFICATION_LABELS[caseData.verificationState][language];

  // Focus management after the multi-step submission flow (EVALUATION.md's accessibility
  // checklist) — a screen-reader user landing here right after submitting needs to be told
  // where they are, not left wherever focus happened to be on the previous page.
  useEffect(() => {
    if (isNew) headingRef.current?.focus();
  }, [isNew]);
  const typeLabel =
    caseData.type === "report"
      ? UI_STRINGS.reportFlow.typeStep.report.title[language]
      : UI_STRINGS.reportFlow.typeStep.proposal.title[language];

  if (deleted) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-10 text-center md:px-8">
        <CheckCircle2 aria-hidden="true" className="mx-auto h-6 w-6 text-teal" />
        <p className="text-ink">{t.manage.deletedNotice[language]}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 md:px-8">
      {isNew && (
        <div className="flex flex-col gap-1 rounded-lg border border-teal/30 bg-mint/50 p-4 text-sm text-ink">
          <div className="flex items-start gap-2">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
            <p>{t.confirmationBanner[language]}</p>
          </div>
          {managementToken && <p className="pl-6 text-ink/80">{t.manageBanner[language]}</p>}
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-slate">{t.heading[language]}</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold text-ink outline-none md:text-3xl"
        >
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
        <ActionTrail status={caseData.status} language={language} />
        <div className="mt-2">
          <span className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium text-slate">
            {verificationLabel}
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 p-4">
        <StatusHistoryTimeline events={caseData.statusHistory} language={language} />
        <p className="mt-3 text-xs text-slate">
          {t.submittedOn[language]}{" "}
          {new Date(caseData.createdAt).toLocaleDateString(language === "es" ? "es-PA" : "en-US")}
        </p>
      </section>

      <p className="text-xs text-slate">{t.noGuaranteeNote[language]}</p>

      <InaccuracyFlagForm caseNumber={caseData.publicCaseNumber} />

      {managementToken && (
        <DeleteSubmission
          caseNumber={caseData.publicCaseNumber}
          managementToken={managementToken}
          onDeleted={() => setDeleted(true)}
        />
      )}
    </div>
  );
}
