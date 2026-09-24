"use client";

import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import type { CategoryConfig, PrivacyConfig } from "@/lib/schema/community";
import type { ImagePick } from "./types";

export function ReviewStep({
  type,
  category,
  description,
  areaLabel,
  image,
  privacy,
  consented,
  onConsentedChange,
  language,
}: {
  type: "report" | "proposal";
  category: CategoryConfig;
  description: string;
  areaLabel: string;
  image: ImagePick | null;
  privacy: PrivacyConfig;
  consented: boolean;
  onConsentedChange: (value: boolean) => void;
  language: Language;
}) {
  const t = UI_STRINGS.reportFlow.reviewStep;
  const typeLabel =
    type === "report"
      ? UI_STRINGS.reportFlow.typeStep.report.title[language]
      : UI_STRINGS.reportFlow.typeStep.proposal.title[language];
  const consentText = language === "es" ? privacy.consentTextEs : privacy.consentTextEn;

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-heading text-[1.9rem] leading-tight tracking-[-0.05em] text-ink md:text-[2.2rem]">{t.heading[language]}</h2>

      <section className="rounded-[17px] bg-mint/60 p-5">
        <h3 className="cg-caps">
          {t.publicHeading[language]}
        </h3>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div>
            <dt className="text-slate">{UI_STRINGS.reportFlow.typeStep.heading[language]}</dt>
            <dd className="font-medium text-ink">{typeLabel}</dd>
          </div>
          <div>
            <dt className="text-slate">{UI_STRINGS.reportFlow.categoryStep.heading[language]}</dt>
            <dd className="font-medium text-ink">
              {language === "es" ? category.labelEs : category.label}
            </dd>
          </div>
          <div>
            <dt className="text-slate">
              {UI_STRINGS.reportFlow.descriptionStep.descriptionLabel[language]}
            </dt>
            <dd className="whitespace-pre-wrap font-medium text-ink">{description}</dd>
          </div>
          <div>
            <dt className="text-slate">{UI_STRINGS.reportFlow.areaStep.heading[language]}</dt>
            <dd className="font-medium text-ink">{areaLabel}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[17px] bg-periwinkle/60 p-5">
        <h3 className="text-sm font-semibold text-ink">{t.privateHeading[language]}</h3>
        <p className="mt-1 text-sm text-ink/80">{t.privateBody[language]}</p>
        {image && (
          <p className="mt-2 text-sm text-ink/80">
            {language === "es" ? "Foto adjunta: " : "Attached photo: "}
            <span className="font-medium">{image.fileName}</span>
          </p>
        )}
      </section>

      <label className="flex items-start gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => onConsentedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-teal"
        />
        <span>
          <span className="font-medium">{t.consentLabel[language]}</span> {consentText}
        </span>
      </label>
    </div>
  );
}
