"use client";

import { Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";

export default function HowItWorksPage() {
  const { language } = useLanguage();
  const t = UI_STRINGS.howItWorks;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 md:px-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink md:text-3xl">{t.heading[language]}</h1>
        <p className="text-slate">{t.intro[language]}</p>
      </section>

      <ol className="flex flex-col gap-4">
        {t.steps.map((step) => (
          <li
            key={step.title.en}
            className="rounded-lg border border-ink/10 p-4"
          >
            <p className="font-semibold text-ink">{step.title[language]}</p>
            <p className="mt-1 text-sm text-slate">{step.body[language]}</p>
          </li>
        ))}
      </ol>

      <section className="flex items-start gap-2 rounded-lg border border-ink/10 bg-blue/50 p-4 text-sm text-ink/80">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate" />
        <p>{t.notEmergency[language]}</p>
      </section>
    </div>
  );
}
