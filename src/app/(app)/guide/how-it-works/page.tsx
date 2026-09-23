"use client";

import { FlaskConical } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { EXPERIENCE } from "@/lib/i18n/experience";
import { AgentDemo } from "@/components/guide/AgentDemo";

export default function GuideHowItWorksPage() {
  const { language } = useLanguage();
  const t = EXPERIENCE.demo;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 md:px-8 lg:pt-12">
      <header className="mb-10 max-w-2xl">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink/30 px-3 py-1 text-sm text-slate">
          <FlaskConical aria-hidden="true" className="h-4 w-4" />
          {t.label[language]}
        </p>
        <h1 className="text-4xl text-ink md:text-5xl">{t.title[language]}</h1>
        <p className="mt-3 text-lg text-slate">{t.intro[language]}</p>
      </header>
      <AgentDemo />
    </div>
  );
}
