"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { buildApproximateArea } from "@/lib/privacy/approximate-area";
import { buildConsentRecord } from "@/lib/privacy/consent";
import { submitCase } from "@/lib/store/actions";
import { StepProgress } from "./StepProgress";
import { TypeStep } from "./TypeStep";
import { CategoryStep } from "./CategoryStep";
import { DescriptionStep } from "./DescriptionStep";
import { AreaStep } from "./AreaStep";
import { ReviewStep } from "./ReviewStep";
import type { ImagePick } from "./types";

const TOTAL_STEPS = 5;

export function ReportWizard({ initialType }: { initialType: "report" | "proposal" | null }) {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState(initialType ? 2 : 1);
  const [type, setType] = useState<"report" | "proposal" | null>(initialType);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<ImagePick | null>(null);
  const [areaValue, setAreaValue] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = useMemo(
    () => community.categories.find((c) => c.id === categoryId) ?? null,
    [community, categoryId],
  );
  const area = useMemo(
    () => community.areas.find((a) => a.id === areaValue) ?? null,
    [community, areaValue],
  );

  const canContinue =
    (step === 1 && type !== null) ||
    (step === 2 && categoryId !== null) ||
    (step === 3 && description.trim().length > 0) ||
    (step === 4 && areaValue !== null) ||
    step === TOTAL_STEPS;

  async function handleSubmit() {
    if (!type || !category) return;
    setSubmitting(true);
    setError(null);
    try {
      const approximateArea = buildApproximateArea(
        areaValue === "prefer_not_to_say" ? null : area,
        language,
      );
      const consent = buildConsentRecord(community.privacy.consentVersion, language);
      const created = await submitCase({
        type,
        communityId: community.id,
        categoryId: category.id,
        description: description.trim(),
        approximateArea,
        consent,
        image: image
          ? { ...image, uploadedAt: new Date().toISOString() }
          : undefined,
      });
      router.push(
        `/cases/${created.publicCaseNumber}?new=1&manage=${encodeURIComponent(created.managementToken)}`,
      );
    } catch {
      setError(UI_STRINGS.reportFlow.reviewStep.genericError[language]);
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[28px] bg-surface p-[clamp(22px,3.2vw,42px)] shadow-[0_14px_45px_#1c3e2910]">
      <StepProgress step={step} totalSteps={TOTAL_STEPS} language={language} />

      {step === 1 && <TypeStep value={type} onChange={setType} language={language} />}
      {step === 2 && (
        <CategoryStep
          categories={community.categories}
          value={categoryId}
          onChange={setCategoryId}
          language={language}
        />
      )}
      {step === 3 && (
        <DescriptionStep
          description={description}
          onDescriptionChange={setDescription}
          image={image}
          onImageChange={setImage}
          language={language}
        />
      )}
      {step === 4 && (
        <AreaStep
          areas={community.areas}
          value={areaValue}
          onChange={setAreaValue}
          language={language}
        />
      )}
      {step === 5 && type && category && (
        <ReviewStep
          type={type}
          category={category}
          description={description}
          areaLabel={
            areaValue === "prefer_not_to_say"
              ? UI_STRINGS.reportFlow.areaStep.preferNotToSay[language]
              : (language === "es" ? area?.labelEs : area?.label) ?? ""
          }
          image={image}
          privacy={community.privacy}
          consented={consented}
          onConsentedChange={setConsented}
          language={language}
        />
      )}

      {error && <p className="mt-4 text-sm font-medium text-coral">{error}</p>}

      <div className="mt-8 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="rounded-full border border-ink px-5 py-3 text-sm font-extrabold text-ink hover:bg-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:invisible"
        >
          {UI_STRINGS.reportFlow.nav.back[language]}
        </button>
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
            disabled={!canContinue}
            className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-[0.8rem] font-extrabold text-[#172b25] hover:bg-lime-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-45"
          >
            {UI_STRINGS.reportFlow.nav.continue[language]}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!consented || submitting}
            className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-[0.8rem] font-extrabold text-[#172b25] hover:bg-lime-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-45"
          >
            {submitting
              ? UI_STRINGS.reportFlow.reviewStep.submitting[language]
              : UI_STRINGS.reportFlow.reviewStep.submit[language]}
          </button>
        )}
      </div>
    </div>
  );
}
