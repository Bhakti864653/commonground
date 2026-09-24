"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Send } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { EXPERIENCE } from "@/lib/i18n/experience";
import { askGuideAction } from "@/lib/guide/actions";
import type { GuideDraftSubmission } from "@/lib/guide/draft-submission";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { submitCase } from "@/lib/store/actions";
import { LogoMark } from "@/components/layout/Logo";
import { DraftReviewCard } from "./DraftReviewCard";
import { GuideActionTrail, buildGuideTrail } from "./GuideActionTrail";
import { GuideSidePanel } from "./GuideSidePanel";
import { labelOf } from "@/lib/i18n/labels";

type Turn = { role: "user" | "assistant"; content: string; emergency?: boolean };

export function GuideChat() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const router = useRouter();
  const t = UI_STRINGS.guide;
  const x = EXPERIENCE.guide;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<GuideDraftSubmission | null>(null);
  const [consented, setConsented] = useState(false);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  async function send(override?: string) {
    const message = (override ?? input).trim();
    if (!message || pending) return;
    setInput("");
    const history = turns.map(({ role, content }) => ({ role, content }));
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setPending(true);
    const result = await askGuideAction(community.id, message, language, history);
    setTurns((prev) => [
      ...prev,
      { role: "assistant", content: result.answer, emergency: result.emergency },
    ]);
    if (result.draft) {
      setDraft(result.draft);
      setConsented(false);
      setDraftError(null);
    }
    setPending(false);
  }

  async function confirmDraft() {
    if (!draft) return;
    setSubmittingDraft(true);
    setDraftError(null);
    try {
      const area = draft.areaId ? community.areas.find((a) => a.id === draft.areaId) ?? null : null;
      const approximateArea = buildApproximateArea(area);
      const consent = buildConsentRecord(community.privacy.consentVersion, language);
      const created = await submitCase({
        type: draft.type,
        communityId: community.id,
        categoryId: draft.categoryId,
        description: draft.description,
        approximateArea,
        consent,
      });
      router.push(
        `/cases/${created.publicCaseNumber}?new=1&manage=${encodeURIComponent(created.managementToken)}`,
      );
    } catch {
      setDraftError(UI_STRINGS.reportFlow.reviewStep.genericError[language]);
      setSubmittingDraft(false);
    }
  }

  function discardDraft() {
    setDraft(null);
    setConsented(false);
    setDraftError(null);
  }

  const lastAssistant = [...turns].reverse().find((turn) => turn.role === "assistant");
  const draftCategory = draft ? community.categories.find((c) => c.id === draft.categoryId) : undefined;
  const draftArea = draft?.areaId ? community.areas.find((a) => a.id === draft.areaId) : undefined;
  const trail = buildGuideTrail({
    language,
    communityName: community.displayName,
    trustedSourceCount: community.trustedSources.length,
    hasUserMessage: turns.some((turn) => turn.role === "user"),
    waitingForReply: pending,
    lastReplyWasEmergency: lastAssistant?.emergency === true,
    draft: draft
      ? {
          summary: `${EXPERIENCE.landscape.markerLegend[draft.type][language]}, ${
            labelOf(draftCategory, language) ?? draft.categoryId
          }`,
          areaLabel: draftArea ? labelOf(draftArea, language) : UI_STRINGS.reportFlow.areaStep.preferNotToSay[language],
        }
      : null,
  });

  return (
    <div className="grid gap-[18px] min-[1000px]:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-h-[420px] flex-col gap-[13px] rounded-[28px] bg-surface p-[clamp(20px,3.2vw,42px)] shadow-[0_14px_45px_#1c3e2910]" aria-live="polite">
          {turns.length === 0 ? (
            <div className="flex flex-1 flex-col justify-between gap-6">
              <div className="flex items-start gap-3">
                <LogoMark tone="ink" className="h-9 w-9 shrink-0" />
                <p className="max-w-[82%] rounded-[20px] bg-mint px-[17px] py-3.5 text-ink">{t.emptyState[language]}</p>
              </div>
              <div>
                <p className="mb-2 text-sm text-slate">{x.startersLabel[language]}</p>
                <div className="flex flex-wrap gap-2">
                  {x.starters.map((starter) => (
                    <button
                      key={starter.en}
                      type="button"
                      onClick={() => send(starter[language])}
                      disabled={pending}
                      className="rounded-full border border-line bg-paper px-3.5 py-2 text-left text-sm font-semibold text-ink hover:bg-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal disabled:opacity-50"
                    >
                      {starter[language]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            turns.map((turn, i) =>
              turn.role === "user" ? (
                <div key={i} className="flex flex-col items-end gap-1">
                  <span className="text-xs text-slate">{x.you[language]}</span>
                  <p className="max-w-[82%] whitespace-pre-wrap rounded-[20px] bg-periwinkle px-[17px] py-3.5 text-ink">{turn.content}</p>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-3">
                  <LogoMark tone="ink" className="mt-5 h-8 w-8 shrink-0" />
                  <div className="flex max-w-[85%] flex-col gap-1">
                    <span className="text-xs text-slate">{x.guideName[language]}</span>
                    <div
                      className={`rounded-[20px] px-[17px] py-3.5 ${
                        turn.emergency ? "border border-coral/40 bg-coral/10 text-ink" : "bg-mint text-ink"
                      }`}
                    >
                      {turn.emergency && (
                        <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-coral">
                          <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                          {UI_STRINGS.reportFlow.descriptionStep.emergencyWarningTitle[language]}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{turn.content}</p>
                    </div>
                  </div>
                </div>
              ),
            )
          )}
          {pending && (
            <div className="flex items-center gap-3">
              <LogoMark tone="ink" className="h-8 w-8 shrink-0 animate-pulse motion-reduce:animate-none" />
              <p className="text-sm text-slate">{t.thinking[language]}</p>
            </div>
          )}
        </div>

        {draft && (
          <DraftReviewCard
            draft={draft}
            community={community}
            language={language}
            consented={consented}
            onConsentedChange={setConsented}
            onConfirm={confirmDraft}
            onDiscard={discardDraft}
            submitting={submittingDraft}
            error={draftError}
          />
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2.5"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label={t.heading[language]}
            placeholder={t.placeholder[language]}
            className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-3 text-ink placeholder:text-slate focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-teal px-5 py-3 text-sm font-extrabold text-cream hover:bg-teal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-50"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            {t.send[language]}
          </button>
        </form>
        <p className="flex items-start gap-2 text-sm text-slate">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
          {x.notEmergency[language]}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-8">
        <GuideSidePanel language={language} />
        <GuideActionTrail steps={trail} language={language} />
      </div>
    </div>
  );
}
