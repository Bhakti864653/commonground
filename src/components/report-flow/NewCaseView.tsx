"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { usePlaces } from "@/lib/places/context";
import { UnconfiguredPlace } from "@/components/map/UnconfiguredPlace";
import { ReportWizard } from "./ReportWizard";

/** The reference's "Start with what you know." page around the real guided submission flow. */
export function NewCaseView({ initialType }: { initialType: "report" | "proposal" | null }) {
  const { language } = useLanguage();
  const { activePlace } = usePlaces();
  const t = FIELD.submit;

  return (
    <div>
      <header className="mb-7">
        <p className="cg-eyebrow">{t.caps[language]}</p>
        <h1 className="mt-4 text-[clamp(3.2rem,6.1vw,6.4rem)] leading-[0.95] tracking-[-0.06em] text-ink">{t.title[language]}</h1>
        <p className="mt-3 max-w-[590px] text-slate">{t.sub[language]}</p>
      </header>

      {activePlace.kind === "unconfigured" ? (
        <UnconfiguredPlace />
      ) : (
        <div className="grid gap-[18px] min-[900px]:grid-cols-[minmax(0,1.3fr)_minmax(290px,0.7fr)]">
          <ReportWizard initialType={initialType} />

          <aside className="px-2.5 py-5 min-[900px]:pl-9">
            <p className="cg-caps">{t.privacyCaps[language]}</p>
            {/* Concentric circles: the resident's words at the center, only an area around them. */}
            <div aria-hidden="true" className="relative mx-auto my-6 h-[220px] w-[220px] rounded-full border-2 border-[#b3c9b0]">
              <span className="absolute inset-8 rounded-full border-2 border-[#b3c9b0]" />
              <span className="absolute inset-[73px] rounded-full bg-lime" />
            </div>
            <p className="my-8 font-heading text-[3.1rem] leading-none tracking-[-0.06em] text-ink">{t.privacyHeadline[language]}</p>
            <ul className="list-disc space-y-1 pl-5 leading-[1.8] text-ink/85">
              {t.privacy.map((item) => (
                <li key={item.en}>{item[language]}</li>
              ))}
            </ul>
            <Link
              href="/guide"
              className="mt-7 inline-flex items-center gap-2 border-b border-ink pb-1 text-[0.88rem] font-extrabold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
            >
              {t.guideAlternative[language]} <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
