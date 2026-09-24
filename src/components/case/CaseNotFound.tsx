"use client";

import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";

export function CaseNotFound({ caseNumber }: { caseNumber: string }) {
  const { language } = useLanguage();
  const t = UI_STRINGS.caseDetail;

  return (
    <div className="flex max-w-2xl flex-col gap-3 py-6">
      <h1 className="text-[clamp(2.6rem,5vw,4.5rem)] text-ink">{t.notFoundHeading[language]}</h1>
      <p className="text-slate">{t.notFoundBody[language]}</p>
      <p className="cg-caps">{caseNumber}</p>
    </div>
  );
}
