"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Asterisk } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";
import { fill } from "@/lib/i18n/experience";
import { usePlaces } from "@/lib/places/context";
import { listCasesForActivity } from "@/lib/store/actions";
import type { PublicCase } from "@/lib/schema/report";
import { CommunityMap } from "@/components/map/CommunityMap";
import { UnconfiguredPlace } from "@/components/map/UnconfiguredPlace";
import { CaseRow } from "@/components/journey/CaseRow";

/** Newest first — the order that numbers both the map pins and the case rows. */
function byNewest(a: PublicCase, b: PublicCase) {
  return b.createdAt.localeCompare(a.createdAt);
}

export default function Home() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const { activePlace } = usePlaces();
  const t = FIELD.home;
  const [cases, setCases] = useState<PublicCase[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCasesForActivity(community.id).then((result) => {
      if (!cancelled) {
        setCases([...result].sort(byNewest));
        setSelectedId(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [community.id]);

  const openCases = cases.filter((c) => c.status !== "closed");
  const unconfigured = activePlace.kind === "unconfigured";

  return (
    <div>
      {/* Intro: the promise and the one primary action. */}
      <section className="mb-8 flex flex-col gap-6 pb-4 md:flex-row md:items-end md:justify-between md:gap-8">
        <div>
          <p className="cg-eyebrow mb-4">{t.eyebrow[language]}</p>
          <h1 className="text-[clamp(3.4rem,10vw,4.7rem)] leading-[0.91] tracking-[-0.072em] text-ink md:text-[clamp(4.2rem,6.2vw,8rem)]">
            {t.headlineTop[language]}
            <br />
            <em className="cg-highlight font-normal">{t.headlineEmphasis[language]}</em>
          </h1>
          {!unconfigured && (
            <p className="mt-5 flex items-center gap-2 text-[0.69rem] font-black uppercase tracking-[0.18em] text-caps">
              {community.displayName}
              <Asterisk aria-hidden="true" className="h-4 w-4 text-[#e58a52]" strokeWidth={2.5} />
              {fill(t.stamp[language], { count: cases.length })}
            </p>
          )}
        </div>
        <div className="md:max-w-[310px] md:pb-1.5">
          <p className="mb-6 leading-relaxed text-ink/75">{t.intro[language]}</p>
          <Link
            href="/report/new"
            className="inline-flex items-center gap-3.5 whitespace-nowrap rounded-full bg-lime px-6 py-[17px] text-[0.8rem] font-extrabold tracking-[0.035em] text-[#172b25] transition hover:-translate-y-0.5 hover:bg-lime-deep hover:shadow-[0_8px_24px_#24433121] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            {t.raise[language]} <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {unconfigured ? (
        <UnconfiguredPlace />
      ) : (
        <>
          <section className="grid gap-7 min-[1100px]:grid-cols-[minmax(0,1.88fr)_minmax(270px,0.76fr)] min-[1100px]:gap-[clamp(24px,4vw,65px)]">
            <CommunityMap community={community} cases={cases} selectedId={selectedId} onSelect={(c) => setSelectedId(c.id)} language={language} />

            {/* Open (unboxed) Guide and pulse, as in the reference. */}
            <div className="flex flex-col min-[520px]:flex-row min-[520px]:gap-[22px] min-[1100px]:flex-col min-[1100px]:gap-0">
              <div className="relative flex flex-1 flex-col gap-6 pb-7 pt-2.5 min-[1100px]:min-h-[290px] min-[1100px]:pb-[42px] min-[1100px]:pt-5">
                <Asterisk aria-hidden="true" className="pointer-events-none absolute -right-2 top-0 h-28 w-28 text-peach" strokeWidth={1.2} />
                <p className="cg-caps relative">{t.guideCaps[language]}</p>
                <h2 className="relative max-w-[310px] text-[clamp(2rem,3.4vw,3.6rem)] leading-none text-ink">{t.guideTease[language]}</h2>
                <Link
                  href="/guide"
                  className="relative mt-auto inline-flex w-max items-center gap-2.5 border-b border-ink pb-1 text-[0.88rem] font-extrabold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
                >
                  {t.talkGuide[language]} <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>

              <div className="flex flex-col justify-between gap-4 border-t border-line pt-5 min-[520px]:flex-1 min-[520px]:border-l min-[520px]:border-t-0 min-[520px]:pl-6 min-[520px]:pt-2 min-[1100px]:flex-none min-[1100px]:border-l-0 min-[1100px]:border-t min-[1100px]:pl-0 min-[1100px]:pt-6">
                <p className="cg-caps">{t.pulseCaps[language]}</p>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-heading text-[5rem] leading-[0.9] tracking-[-0.11em] text-ink md:text-[6.4rem]">
                      {String(openCases.length).padStart(2, "0")}
                    </p>
                    <p className="mt-2 max-w-[170px] text-[0.88rem] font-semibold text-ink/85">{t.pulseText[language]}</p>
                  </div>
                  <Link
                    href="/activity"
                    aria-label={t.allCases[language]}
                    className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-full border border-periwinkle text-pin-progress hover:bg-periwinkle/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal md:h-[85px] md:w-[85px]"
                  >
                    <ArrowUpRight aria-hidden="true" className="h-8 w-8" strokeWidth={1.3} />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10 md:mt-[66px]">
            <div className="mb-[18px] flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="cg-eyebrow mb-2.5">{t.recordCaps[language]}</p>
                <h2 className="text-[3rem] text-ink md:text-[clamp(3rem,4.2vw,4.5rem)]">{t.recordTitle[language]}</h2>
              </div>
              <Link
                href="/activity"
                className="inline-flex w-max items-center gap-2.5 text-[0.88rem] font-extrabold text-ink underline underline-offset-[5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
              >
                {t.allCases[language]} <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
            <ul className="border-t border-[#9faf9d]">
              {cases.slice(0, 3).map((c, i) => (
                <CaseRow key={c.id} caseItem={c} index={i} category={community.categories.find((cat) => cat.id === c.categoryId)} language={language} />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
