"use client";

import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { usePlaces } from "@/lib/places/context";
import { GuideChat } from "@/components/guide/GuideChat";
import { UnconfiguredPlace } from "@/components/map/UnconfiguredPlace";

export default function GuidePage() {
  const { language } = useLanguage();
  const { activePlace } = usePlaces();
  const t = FIELD.guide;

  return (
    <div>
      <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="cg-eyebrow">{t.caps[language]}</p>
          <h1 className="mt-4 text-[clamp(3.2rem,6.1vw,6.4rem)] leading-[0.95] tracking-[-0.06em] text-ink">{t.title[language]}</h1>
          <p className="mt-3 max-w-[590px] text-slate">{t.sub[language]}</p>
        </div>
        <span className="inline-flex w-max shrink-0 items-center gap-2 rounded-full border border-line px-3.5 py-2 text-[0.8rem] font-extrabold text-ink">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-forest" />
          {t.liveBadge[language]}
        </span>
      </header>
      {activePlace.kind === "unconfigured" ? <UnconfiguredPlace /> : <GuideChat />}
    </div>
  );
}
