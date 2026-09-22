"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Send } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { askGuideAction } from "@/lib/guide/actions";
import type { GuideDraftSubmission } from "@/lib/guide/draft-submission";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { submitCase } from "@/lib/store/actions";
import { DraftReviewCard } from "./DraftReviewCard";

type Turn = { role: "user" | "assistant"; content: string; emergency?: boolean };

export function GuideChat() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const router = useRouter();
  const t = UI_STRINGS.guide;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<GuideDraftSubmission | null>(null);
  const [consented, setConsented] = useState(false);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  async function send() {
    const message = input.trim();
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
      const approximateArea = buildApproximateArea(area, language);
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-[16rem] flex-col gap-3 rounded-lg border border-ink/10 p-4">
        {turns.length === 0 ? (
          <p className="text-sm text-slate">{t.emptyState[language]}</p>
        ) : (
          turns.map((turn, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                turn.role === "user"
                  ? "self-end bg-teal text-cream"
                  : turn.emergency
                    ? "self-start border border-coral/40 bg-coral/10 text-ink"
                    : "self-start bg-mint/40 text-ink"
              }`}
            >
              {turn.emergency && (
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-coral">
                  <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
                  {language === "es" ? "No es un servicio de emergencia" : "Not an emergency service"}
                </p>
              )}
              <p className="whitespace-pre-wrap">{turn.content}</p>
            </div>
          ))
        )}
        {pending && <p className="self-start text-sm text-slate">{t.thinking[language]}</p>}
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
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label={t.heading[language]}
          placeholder={t.placeholder[language]}
          className="flex-1 rounded-md border border-ink/15 bg-cream px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-teal px-3 py-2 text-sm font-medium text-cream disabled:opacity-50"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
          {t.send[language]}
        </button>
      </form>
    </div>
  );
}
