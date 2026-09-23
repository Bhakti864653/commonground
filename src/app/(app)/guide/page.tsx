"use client";

import { useLanguage } from "@/lib/i18n/context";
import { EXPERIENCE } from "@/lib/i18n/experience";
import { GuideChat } from "@/components/guide/GuideChat";

export default function GuidePage() {
  const { language } = useLanguage();
  const t = EXPERIENCE.guide;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 md:px-8 lg:pt-12">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-4xl text-ink md:text-5xl">{t.heading[language]}</h1>
        <p className="mt-3 text-lg text-slate">{t.intro[language]}</p>
      </header>
      <GuideChat />
    </div>
  );
}
