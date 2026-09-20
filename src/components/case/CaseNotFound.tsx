"use client";

import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";

export function CaseNotFound({ caseNumber }: { caseNumber: string }) {
  const { language } = useLanguage();
  const t = UI_STRINGS.caseDetail;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-10 text-center md:px-8">
      <h1 className="text-xl font-semibold text-ink">{t.notFoundHeading[language]}</h1>
      <p className="text-sm text-slate">{t.notFoundBody[language]}</p>
      <p className="mt-2 text-xs text-slate">{caseNumber}</p>
    </div>
  );
}
