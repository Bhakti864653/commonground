"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, Link2, MapPin } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { EXPERIENCE, fill } from "@/lib/i18n/experience";
import { FIELD } from "@/lib/i18n/field-notes";
import { formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import { STATUS_LABELS, VERIFICATION_LABELS, type PublicCase } from "@/lib/schema/report";
import type { CategoryConfig } from "@/lib/schema/community";
import { StatusPill, VerificationPill } from "@/components/journey/Pills";
import { StageMeter } from "@/components/journey/StageMeter";
import { InaccuracyFlagForm } from "./InaccuracyFlagForm";
import { DeleteSubmission } from "./DeleteSubmission";
import { dateLocale } from "@/lib/i18n/languages";
import { labelOf, noteOf } from "@/lib/i18n/labels";

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
  const f = FIELD.caseView;
  const [deleted, setDeleted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const area = formatApproximateAreaLabel(caseData.approximateArea, language);
  const dateFormat = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale(language), { day: "numeric", month: "long", year: "numeric" });

  // Focus management after the multi-step submission flow (EVALUATION.md's accessibility
  // checklist) — a screen-reader user landing here right after submitting needs to be told
  // where they are, not left wherever focus happened to be on the previous page.
  useEffect(() => {
    if (isNew) headingRef.current?.focus();
  }, [isNew]);

  if (deleted) {
    return (
      <div className="flex max-w-2xl flex-col gap-2 py-16">
        <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-teal" />
        <p className="text-ink">{t.manage.deletedNotice[language]}</p>
      </div>
    );
  }

  const events = [...caseData.statusHistory].reverse();

  return (
    <div>
      <Link
        href="/activity"
        className="mb-[22px] inline-flex items-center gap-2 text-[0.88rem] font-extrabold text-ink underline underline-offset-[5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {f.back[language]}
      </Link>

      {isNew && (
        <div className="mb-[18px] flex flex-col gap-1 rounded-[20px] bg-lime/60 p-5 text-ink">
          <p className="flex items-start gap-2 font-semibold">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {t.confirmationBanner[language]}
          </p>
          {managementToken && <p className="pl-6 text-sm">{t.manageBanner[language]}</p>}
        </div>
      )}

      <div className="grid gap-[18px] min-[1000px]:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.6fr)]">
        <article className="rounded-[28px] bg-surface p-[clamp(24px,3.2vw,42px)] shadow-[0_14px_45px_#1c3e2910]">
          <p className="cg-eyebrow">
            <span className="tabular-nums">{caseData.publicCaseNumber}</span> · {area}
          </p>
          <h1 ref={headingRef} tabIndex={-1} className="mb-4 mt-3.5 text-[clamp(2.5rem,4.5vw,5rem)] text-ink outline-none">
            {labelOf(category, language)}
          </h1>
          <p className="whitespace-pre-wrap text-[1.05rem] leading-relaxed text-ink/90">{caseData.description}</p>

          <div className="my-[22px] flex flex-wrap gap-2.5">
            <StatusPill status={caseData.status} language={language} />
            <VerificationPill state={caseData.verificationState} language={language} />
            <span className="inline-flex items-center rounded-full bg-status-neutral px-3 py-[7px] text-[0.72rem] font-extrabold text-ink">
              {FIELD.explore[caseData.type][language]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-status-neutral px-3 py-[7px] text-[0.72rem] font-extrabold text-ink">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
              {area}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate">
            <span className="font-bold text-ink">{f.stage[language]}:</span>
            <StageMeter status={caseData.status} language={language} />
          </div>

          <h2 className="mt-11 text-[clamp(2.2rem,3.4vw,3.2rem)] text-ink">{f.timelineTitle[language]}</h2>
          <ol className="ml-2 mt-7 border-l-2 border-[#b9cbb9] pl-[25px]">
            {events.map((event, i) => {
              const note = noteOf(event, language);
              return (
                <li key={event.id} className="relative pb-[29px] last:pb-2">
                  <span aria-hidden="true" className="absolute -left-[33px] top-1 h-[13px] w-[13px] rounded-full border-[3px] border-surface bg-ink" />
                  <p className="text-[0.78rem] font-extrabold text-slate">
                    {i === 0 ? f.latest[language] : f.earlier[language]} · <time dateTime={event.occurredAt}>{dateFormat(event.occurredAt)}</time>
                  </p>
                  <h3 className="my-1.5 font-sans text-base font-bold tracking-normal text-ink">{STATUS_LABELS[event.status][language]}</h3>
                  {note && <p className="text-[0.92rem] text-ink/85">{note}</p>}
                  <p className="mt-1 text-[0.85rem] text-slate">
                    {event.actorType === "moderator" ? f.byModerator[language] : event.actorType === "verified_source" ? f.bySource[language] : f.bySystem[language]}
                  </p>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 rounded-[17px] bg-mint/60 p-4 text-[0.88rem] text-ink/85">{f.noForward[language]}</p>
          <p className="mt-4 text-sm text-slate">
            {fill(f.submitted[language], { date: dateFormat(caseData.createdAt) })}. {t.noGuaranteeNote[language]} {communityDisplayName}.
          </p>
        </article>

        <aside className="flex flex-col gap-5">
          <section className="rounded-[25px] bg-note p-[25px] text-ink">
            <p className="cg-caps">{f.readingCaps[language]}</p>
            <h2 className="my-3.5 text-[2rem]">{VERIFICATION_LABELS[caseData.verificationState][language]}</h2>
            <p className="text-[0.9rem]">{EXPERIENCE.caseJourney.verificationExplain[caseData.verificationState][language]}</p>
            <p className="mt-3 text-[0.88rem]">{f.readingBody[language]}</p>
            {caseData.verifiedSource && (
              <p className="mt-3 text-sm">
                {EXPERIENCE.caseJourney.checkedSource[language]}:{" "}
                {/* The URL is schema-validated as http(s) only before it can ever be stored. */}
                <a href={caseData.verifiedSource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold underline underline-offset-4">
                  {caseData.verifiedSource.title}
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
              </p>
            )}
            {caseData.isDuplicateOf && (
              <p className="mt-3 flex items-center gap-1.5 text-sm">
                <Link2 aria-hidden="true" className="h-4 w-4" />
                <Link href={`/cases/${caseData.isDuplicateOf}`} className="font-bold underline underline-offset-4">
                  {fill(EXPERIENCE.caseJourney.duplicateOf[language], { case: caseData.isDuplicateOf })}
                </Link>
              </p>
            )}
            <div className="mt-6">
              <InaccuracyFlagForm caseNumber={caseData.publicCaseNumber} />
            </div>
          </section>

          {managementToken ? (
            <DeleteSubmission caseNumber={caseData.publicCaseNumber} managementToken={managementToken} onDeleted={() => setDeleted(true)} />
          ) : (
            <p className="text-[0.85rem] text-slate">
              {f.manageHint[language]}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
