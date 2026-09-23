"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Link2 } from "lucide-react";
import { renderCategoryIcon } from "@/components/icons/category-icon-map";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { EXPERIENCE, fill } from "@/lib/i18n/experience";
import { formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import type { PublicCase } from "@/lib/schema/report";
import type { AreaConfig, CategoryConfig } from "@/lib/schema/community";
import { getCommunityById } from "@/data/communities";
import { useTheme } from "@/lib/theme/use-theme";
import { useLandscapeAreas } from "@/components/landscape/CommunityLandscape";
import { LandscapeIllustration } from "@/components/landscape/LandscapeIllustration";
import { CaseJourneyTrail } from "@/components/journey/CaseJourneyTrail";
import { StatusPill, VerificationPill } from "@/components/journey/Pills";
import { InaccuracyFlagForm } from "./InaccuracyFlagForm";
import { DeleteSubmission } from "./DeleteSubmission";

const NO_CASES: PublicCase[] = [];
const NO_AREAS: AreaConfig[] = [];

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
  const { theme } = useTheme();
  const t = UI_STRINGS.caseDetail;
  const j = EXPERIENCE.caseJourney;
  const [deleted, setDeleted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const community = getCommunityById(caseData.communityId);
  const areas = useLandscapeAreas(community?.areas ?? NO_AREAS, NO_CASES, language);

  // Focus management after the multi-step submission flow (EVALUATION.md's accessibility
  // checklist) — a screen-reader user landing here right after submitting needs to be told
  // where they are, not left wherever focus happened to be on the previous page.
  useEffect(() => {
    if (isNew) headingRef.current?.focus();
  }, [isNew]);

  const typeLabel = EXPERIENCE.landscape.markerLegend[caseData.type][language];

  if (deleted) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-16 text-center md:px-8">
        <CheckCircle2 aria-hidden="true" className="mx-auto h-6 w-6 text-teal" />
        <p className="text-ink">{t.manage.deletedNotice[language]}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-8 md:px-8 lg:pt-12">
      {isNew && (
        <div className="mb-8 flex flex-col gap-1 rounded-2xl border border-teal/30 bg-mint/70 p-5 text-ink">
          <div className="flex items-start gap-2">
            <CheckCircle2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-teal" />
            <p>{t.confirmationBanner[language]}</p>
          </div>
          {managementToken && <p className="pl-6 text-sm text-ink/80">{t.manageBanner[language]}</p>}
        </div>
      )}

      <header className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-slate">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint text-teal">
            {renderCategoryIcon(category.icon, { className: "h-4 w-4" })}
          </span>
          {typeLabel}, {language === "es" ? category.labelEs : category.label}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="text-4xl tabular-nums text-ink outline-none md:text-5xl">
          <span className="sr-only">{j.kicker[language]} </span>
          {caseData.publicCaseNumber}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={caseData.status} language={language} />
          <VerificationPill state={caseData.verificationState} language={language} />
        </div>
        <blockquote className="mt-2 max-w-3xl border-l-4 border-turquoise pl-5 font-heading text-xl leading-relaxed text-ink/90 md:text-2xl">
          <p className="whitespace-pre-wrap">{caseData.description}</p>
        </blockquote>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <section className="lg:col-span-7" aria-labelledby="journey-heading">
          <h2 id="journey-heading" className="text-2xl text-ink md:text-3xl">
            {j.journeyHeading[language]}
          </h2>
          <p className="mb-6 mt-1 text-slate">{j.journeyIntro[language]}</p>
          <CaseJourneyTrail status={caseData.status} events={caseData.statusHistory} language={language} />
          <p className="mt-8 text-sm text-slate">
            {t.submittedOn[language]}{" "}
            {new Date(caseData.createdAt).toLocaleDateString(language === "es" ? "es-PA" : "en-US")}. {t.noGuaranteeNote[language]}
          </p>
        </section>

        <aside className="flex flex-col gap-6 lg:col-span-5">
          <section className="rounded-[2rem] border border-ink/10 p-5">
            <h2 className="text-xl text-ink">{j.whereHeading[language]}</h2>
            <p className="mt-1 font-medium text-teal">{formatApproximateAreaLabel(caseData.approximateArea, language)}</p>
            <LandscapeIllustration
              areas={areas}
              cases={NO_CASES}
              theme={theme === "dark" ? "dark" : "light"}
              selectedAreaId={caseData.approximateArea.areaId ?? null}
              selectedCaseId={null}
              interactive={false}
              caseLabel={() => ""}
              labels={{
                plaza: EXPERIENCE.landscape.landmarks.plaza[language],
                hall: EXPERIENCE.landscape.landmarks.hall[language],
                drainage: EXPERIENCE.landscape.landmarks.drainage[language],
              }}
              className="mt-3 aspect-[10/9] w-full"
            />
            <p className="mt-2 text-xs text-slate">
              {j.whereNote[language]} {communityDisplayName}.
            </p>
          </section>

          <section className="rounded-[2rem] bg-surface p-5">
            <h2 className="text-xl text-ink">{j.verificationHeading[language]}</h2>
            <div className="mt-3">
              <VerificationPill state={caseData.verificationState} language={language} />
            </div>
            <p className="mt-3 text-ink/85">{j.verificationExplain[caseData.verificationState][language]}</p>
            {caseData.verifiedSource && (
              <p className="mt-3 text-sm">
                <span className="text-slate">{j.checkedSource[language]}: </span>
                {/* The URL is schema-validated as http(s) only before it can ever be stored. */}
                <a
                  href={caseData.verifiedSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-teal underline underline-offset-4"
                >
                  {caseData.verifiedSource.title}
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
              </p>
            )}
            {caseData.isDuplicateOf && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-ink/85">
                <Link2 aria-hidden="true" className="h-4 w-4 text-slate" />
                <Link href={`/cases/${caseData.isDuplicateOf}`} className="text-teal underline underline-offset-4">
                  {fill(j.duplicateOf[language], { case: caseData.isDuplicateOf })}
                </Link>
              </p>
            )}
          </section>

          <InaccuracyFlagForm caseNumber={caseData.publicCaseNumber} />

          {managementToken && (
            <DeleteSubmission
              caseNumber={caseData.publicCaseNumber}
              managementToken={managementToken}
              onDeleted={() => setDeleted(true)}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
