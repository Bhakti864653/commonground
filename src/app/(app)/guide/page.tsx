"use client";

import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { GuideChat } from "@/components/guide/GuideChat";

export default function GuidePage() {
  const { language } = useLanguage();
  const t = UI_STRINGS.guide;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t.heading[language]}</h1>
        <p className="mt-1 text-sm text-slate">{t.intro[language]}</p>
      </div>
      <GuideChat />
    </div>
  );
}
