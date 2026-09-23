"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Lightbulb, MessageCircleQuestion, PenLine, Search, ShieldCheck, TriangleAlert, Waypoints } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { EXPERIENCE, fill } from "@/lib/i18n/experience";
import { listCasesForActivity } from "@/lib/store/actions";
import type { PublicCase } from "@/lib/schema/report";
import { CaseLookupForm } from "@/components/case/CaseLookupForm";
import { CommunityLandscape } from "@/components/landscape/CommunityLandscape";
import { CaseSelectionPanel } from "@/components/landscape/CaseSelectionPanel";
import { LandscapeLegend } from "@/components/landscape/LandscapeLegend";
import { CivicJourney } from "@/components/journey/CivicJourney";
import { CaseRow } from "@/components/journey/CaseRow";

export default function Home() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const t = EXPERIENCE.home;
  const isFictional = community.status === "demo";
  const [cases, setCases] = useState<PublicCase[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<PublicCase | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCasesForActivity(community.id).then((result) => {
      if (!cancelled) {
        setCases(result);
        setSelectedCase(null);
        setSelectedAreaId(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [community.id]);

  const recent = [...cases].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Hero: the promise on the left, the living town on the right. */}
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-10 pt-8 md:px-8 lg:grid-cols-12 lg:gap-10 lg:pb-16 lg:pt-14">
        <div className="flex flex-col justify-center gap-6 lg:col-span-5">
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate">
            <span className="inline-block h-2 w-2 rounded-full bg-turquoise" aria-hidden="true" />
            {fill(t.pilotLine[language], { community: community.displayName })}
            {isFictional && (
              <span className="rounded-full border border-coral/40 px-2 py-0.5 text-xs font-medium text-coral">
                {t.fictional[language]}
              </span>
            )}
          </p>
          <h1 className="text-[2.6rem] leading-[1.05] text-ink sm:text-5xl lg:text-[3.6rem]">{t.title[language]}</h1>
          <p className="max-w-[34rem] text-lg leading-relaxed text-ink/80">{t.intro[language]}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/report/new?type=report"
              className="inline-flex items-center gap-2 rounded-full bg-teal px-5 py-3 font-medium text-cream hover:bg-teal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              <PenLine aria-hidden="true" className="h-4.5 w-4.5" />
              {t.reportCta[language]}
            </Link>
            <Link
              href="/report/new?type=proposal"
              className="inline-flex items-center gap-2 rounded-full border border-teal/40 px-5 py-3 font-medium text-teal hover:bg-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              <Lightbulb aria-hidden="true" className="h-4.5 w-4.5" />
              {t.proposeCta[language]}
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-7">
          <div className="relative">
            <CommunityLandscape
              community={community}
              cases={cases}
              language={language}
              selectedAreaId={selectedAreaId}
              selectedCaseId={selectedCase?.id ?? null}
              onSelectArea={(id) => {
                setSelectedAreaId(id);
                setSelectedCase(null);
              }}
              onSelectCase={setSelectedCase}
              className="h-[22rem] rounded-[2rem] border border-ink/10 bg-cream sm:h-[28rem] lg:h-[34rem]"
            />
            {selectedCase && (
              // Above the scene's HTML area labels (their z-index tops out at 20).
              <div className="pointer-events-none absolute bottom-4 left-4 z-[25] hidden w-[22rem] lg:block">
                <div className="pointer-events-auto">
                  <CaseSelectionPanel caseItem={selectedCase} community={community} language={language} onClose={() => setSelectedCase(null)} />
                </div>
              </div>
            )}
          </div>
          {selectedCase && (
            <div className="lg:hidden">
              <CaseSelectionPanel caseItem={selectedCase} community={community} language={language} onClose={() => setSelectedCase(null)} />
            </div>
          )}
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
            <p className="max-w-md text-sm text-slate">{t.landscapeCaption[language]}</p>
            <LandscapeLegend language={language} />
          </div>
        </div>
      </section>

      {/* The journey every report takes. */}
      <section className="border-y border-ink/10 bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 lg:py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-3xl text-ink md:text-4xl">{t.journeyHeading[language]}</h2>
            <p className="mt-3 text-lg text-slate">{t.journeyIntro[language]}</p>
          </div>
          <CivicJourney language={language} />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 md:px-8 lg:grid-cols-12 lg:py-20">
        {/* Latest activity, as a ledger. */}
        <div className="lg:col-span-7">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-2xl text-ink md:text-3xl">{t.recentHeading[language]}</h2>
            <Link href="/activity" className="shrink-0 text-sm font-medium text-teal underline decoration-teal/40 underline-offset-4 hover:decoration-teal">
              {t.seeAllActivity[language]}
            </Link>
          </div>
          <ul className="-mx-3 divide-y divide-ink/10">
            {recent.map((c) => (
              <CaseRow key={c.id} caseItem={c} category={community.categories.find((cat) => cat.id === c.categoryId)} language={language} />
            ))}
          </ul>
        </div>

        {/* The Guide, shown by what it does rather than what it is. */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="rounded-[2rem] bg-teal p-7 text-cream">
            <h2 className="text-2xl md:text-3xl">{t.guideHeading[language]}</h2>
            <p className="mt-3 leading-relaxed text-cream/85">{t.guideBody[language]}</p>
            <ol className="mt-6 flex flex-col gap-3 text-sm">
              {[
                { Icon: Search, text: EXPERIENCE.demo.steps[2].title[language] },
                { Icon: ShieldCheck, text: t.guideSafetyStep[language] },
                { Icon: PenLine, text: EXPERIENCE.demo.steps[5].title[language] },
                { Icon: BadgeCheck, text: EXPERIENCE.demo.steps[6].title[language], approval: true },
              ].map(({ Icon, text, approval }) => (
                <li key={text} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      approval ? "bg-yellow text-on-yellow" : "bg-cream/15 text-cream"
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span>
                    {text}
                    {approval && <span className="ml-2 text-xs text-cream/70">({EXPERIENCE.guide.status.approval[language]})</span>}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/guide"
                className="inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2.5 text-sm font-medium text-teal hover:bg-cream/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
              >
                <MessageCircleQuestion aria-hidden="true" className="h-4 w-4" />
                {t.guideCta[language]}
              </Link>
              <Link
                href="/guide/how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-cream/40 px-4 py-2.5 text-sm font-medium text-cream hover:bg-cream/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
              >
                <Waypoints aria-hidden="true" className="h-4 w-4" />
                {t.guideDemoCta[language]}
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-ink/10 p-6">
            <h2 className="text-xl text-ink">{t.trackHeading[language]}</h2>
            <p className="mt-1 text-sm text-slate">{t.trackBody[language]}</p>
            <CaseLookupForm />
          </div>
        </div>
      </section>

      {/* What CommonGround is not — kept, because it's a safety promise. */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-14 md:px-8">
        <div className="flex gap-4 rounded-[2rem] bg-blue/60 p-6 md:p-8">
          <TriangleAlert aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-ink/70" />
          <div>
            <h2 className="text-xl text-ink">{UI_STRINGS.home.disclaimerHeading[language]}</h2>
            <p className="mt-2 max-w-3xl leading-relaxed text-ink/80">{UI_STRINGS.home.disclaimerBody[language]}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
