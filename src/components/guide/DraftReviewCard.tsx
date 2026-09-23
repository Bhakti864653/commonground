"use client";

import { AlertTriangle } from "lucide-react";
import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import { detectEmergencyPhrase } from "@/lib/guide/emergency";
import type { GuideDraftSubmission } from "@/lib/guide/draft-submission";
import type { CommunityConfig } from "@/lib/schema/community";

/**
 * Mirrors ReportWizard's ReviewStep (same field set, same consent gating) so a chat-drafted
 * submission goes through the identical explicit-confirmation step a manually-filled-out one
 * does — the Guide only ever gets this far, it never calls submitCase itself.
 */
export function DraftReviewCard({
  draft,
  community,
  language,
  consented,
  onConsentedChange,
  onConfirm,
  onDiscard,
  submitting,
  error,
}: {
  draft: GuideDraftSubmission;
  community: CommunityConfig;
  language: Language;
  consented: boolean;
  onConsentedChange: (value: boolean) => void;
  onConfirm: () => void;
  onDiscard: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const t = UI_STRINGS.guide.draft;
  const category = community.categories.find((c) => c.id === draft.categoryId);
  const area = draft.areaId ? community.areas.find((a) => a.id === draft.areaId) : null;
  const typeLabel =
    draft.type === "report"
      ? UI_STRINGS.reportFlow.typeStep.report.title[language]
      : UI_STRINGS.reportFlow.typeStep.proposal.title[language];
  const areaLabel = area
    ? language === "es"
      ? area.labelEs
      : area.label
    : UI_STRINGS.reportFlow.areaStep.preferNotToSay[language];
  const isEmergency = detectEmergencyPhrase(draft.description);

  return (
    <section className="cg-arrive flex flex-col gap-4 rounded-[2rem] border-2 border-yellow bg-surface p-5 md:p-6">
      <div>
        <h3 className="text-xl text-ink">{t.heading[language]}</h3>
        <p className="mt-1 text-xs text-slate">{t.notSubmittedYet[language]}</p>
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        <div>
          <dt className="text-slate">{UI_STRINGS.reportFlow.typeStep.heading[language]}</dt>
          <dd className="font-medium text-ink">{typeLabel}</dd>
        </div>
        <div>
          <dt className="text-slate">{UI_STRINGS.reportFlow.categoryStep.heading[language]}</dt>
          <dd className="font-medium text-ink">
            {category ? (language === "es" ? category.labelEs : category.label) : draft.categoryId}
          </dd>
        </div>
        <div>
          <dt className="text-slate">
            {UI_STRINGS.reportFlow.descriptionStep.descriptionLabel[language]}
          </dt>
          <dd className="whitespace-pre-wrap font-medium text-ink">{draft.description}</dd>
        </div>
        <div>
          <dt className="text-slate">{UI_STRINGS.reportFlow.areaStep.heading[language]}</dt>
          <dd className="font-medium text-ink">{areaLabel}</dd>
        </div>
      </dl>

      {isEmergency && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm text-ink"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
          <div>
            <p className="font-semibold text-coral">
              {UI_STRINGS.reportFlow.descriptionStep.emergencyWarningTitle[language]}
            </p>
            <p className="mt-0.5">
              {UI_STRINGS.reportFlow.descriptionStep.emergencyWarningBody[language]}
            </p>
          </div>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => onConsentedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-teal"
        />
        <span>
          <span className="font-medium">
            {UI_STRINGS.reportFlow.reviewStep.consentLabel[language]}
          </span>{" "}
          {language === "es" ? community.privacy.consentTextEs : community.privacy.consentTextEn}
        </span>
      </label>

      {error && <p className="text-sm font-medium text-coral">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onDiscard}
          disabled={submitting}
          className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:bg-mint disabled:opacity-40"
        >
          {t.discard[language]}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!consented || submitting}
          className="rounded-full bg-teal px-4 py-2 text-sm font-medium text-cream hover:bg-teal/90 disabled:opacity-40"
        >
          {submitting
            ? UI_STRINGS.reportFlow.reviewStep.submitting[language]
            : t.confirm[language]}
        </button>
      </div>
    </section>
  );
}
