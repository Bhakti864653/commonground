"use client";

import { useEffect, useState } from "react";
import { TrendingUp, X } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { EXPERIENCE, fill } from "@/lib/i18n/experience";
import { getTrendsForActivity, listCasesForActivity } from "@/lib/store/actions";
import type { PublicCase } from "@/lib/schema/report";
import type { Trend } from "@/lib/insights/trends";
import { CommunityLandscape, useLandscapeAreas } from "@/components/landscape/CommunityLandscape";
import { CaseSelectionPanel } from "@/components/landscape/CaseSelectionPanel";
import { LandscapeLegend } from "@/components/landscape/LandscapeLegend";
import { CaseRow } from "@/components/journey/CaseRow";

type TypeFilter = "all" | "report" | "proposal";

export default function ActivityPage() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const t = EXPERIENCE.activity;
  const [cases, setCases] = useState<PublicCase[] | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<PublicCase | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCasesForActivity(community.id), getTrendsForActivity(community.id)]).then(
      ([caseResult, trendResult]) => {
        if (!cancelled) {
          setCases(caseResult);
          setTrends(trendResult);
          setSelectedAreaId(null);
          setSelectedCase(null);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [community.id]);

  const byType = cases?.filter((c) => filter === "all" || c.type === filter) ?? [];
  const visible = byType.filter((c) => selectedAreaId === null || c.approximateArea.areaId === selectedAreaId);
  const areas = useLandscapeAreas(community.areas, byType, language);
  const selectedArea = areas.find((a) => a.area.id === selectedAreaId);

  const filters: { key: TypeFilter; label: string }[] = [
    { key: "all", label: UI_STRINGS.activity.filterAll[language] },
    { key: "report", label: UI_STRINGS.reportFlow.typeStep.report.title[language] },
    { key: "proposal", label: UI_STRINGS.reportFlow.typeStep.proposal.title[language] },
  ];

  function selectArea(id: string | null) {
    setSelectedAreaId(id);
    setSelectedCase(null);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 md:px-8 lg:pt-12">
      <header className="max-w-2xl">
        <h1 className="text-4xl text-ink md:text-5xl">{t.heading[language]}</h1>
        <p className="mt-3 text-lg text-slate">{t.intro[language]}</p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:gap-10">
        {/* The landscape stays in view while the list scrolls beside it. */}
        <div className="flex flex-col gap-3 lg:col-span-6">
          <div className="flex flex-col gap-3 lg:sticky lg:top-24">
            <div className="relative">
              <CommunityLandscape
                community={community}
                cases={byType}
                language={language}
                selectedAreaId={selectedAreaId}
                selectedCaseId={selectedCase?.id ?? null}
                onSelectArea={selectArea}
                onSelectCase={setSelectedCase}
                className="h-[20rem] rounded-[2rem] border border-ink/10 bg-cream sm:h-[26rem] lg:h-[32rem]"
              />
              {selectedCase && (
                // Above the scene's HTML area labels (their z-index tops out at 20).
                <div className="absolute inset-x-3 bottom-3 z-[25] hidden lg:block">
                  <CaseSelectionPanel caseItem={selectedCase} community={community} language={language} onClose={() => setSelectedCase(null)} />
                </div>
              )}
            </div>
            {selectedCase && (
              <div className="lg:hidden">
                <CaseSelectionPanel caseItem={selectedCase} community={community} language={language} onClose={() => setSelectedCase(null)} />
              </div>
            )}

            {/* Every area is also a plain button — the landscape is never the only way in. */}
            <div role="group" aria-label={EXPERIENCE.landscape.areasLabel[language]} className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => selectArea(null)}
                aria-pressed={selectedAreaId === null}
                className={chip(selectedAreaId === null)}
              >
                {EXPERIENCE.landscape.allAreas[language]}
              </button>
              {areas.map((a) => (
                <button
                  key={a.area.id}
                  type="button"
                  onClick={() => selectArea(selectedAreaId === a.area.id ? null : a.area.id)}
                  aria-pressed={selectedAreaId === a.area.id}
                  className={chip(selectedAreaId === a.area.id)}
                >
                  {a.label}
                  <span className="tabular-nums opacity-70">{a.count}</span>
                </button>
              ))}
            </div>
            <LandscapeLegend language={language} />
            <p className="text-xs leading-relaxed text-slate">{EXPERIENCE.landscape.disclaimer[language]}</p>
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:col-span-6">
          {trends.length > 0 && (
            <section className="rounded-[2rem] bg-mint/60 p-6">
              <h2 className="flex items-center gap-2 text-xl text-ink">
                <TrendingUp aria-hidden="true" className="h-5 w-5 text-teal" />
                {t.patternsHeading[language]}
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-ink/85">
                {trends.map((trend) => {
                  const category = community.categories.find((c) => c.id === trend.categoryId);
                  const area = community.areas.find((a) => a.id === trend.areaId);
                  const sentence = UI_STRINGS.activity.trendSentence[language]
                    .replace("{count}", String(trend.count))
                    .replace("{category}", (language === "es" ? category?.labelEs : category?.label) ?? trend.categoryId)
                    .replace("{area}", (language === "es" ? area?.labelEs : area?.label) ?? "—")
                    .replace("{days}", String(trend.windowDays));
                  return (
                    <li key={`${trend.categoryId}-${trend.areaId}`}>
                      <button
                        type="button"
                        onClick={() => trend.areaId && selectArea(trend.areaId)}
                        className="text-left underline decoration-teal/30 underline-offset-4 hover:decoration-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
                      >
                        {sentence}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl text-ink">
                {selectedArea ? fill(t.filteredTo[language], { area: selectedArea.label }) : t.listHeading[language]}
              </h2>
              {selectedArea && (
                <button
                  type="button"
                  onClick={() => selectArea(null)}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm text-slate hover:bg-mint hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                  {t.clearArea[language]}
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={t.listHeading[language]}>
              {filters.map((f) => (
                <button key={f.key} type="button" onClick={() => setFilter(f.key)} aria-pressed={filter === f.key} className={chip(filter === f.key)}>
                  {f.label}
                </button>
              ))}
              <span className="ml-auto text-sm tabular-nums text-slate">{fill(t.count[language], { count: visible.length })}</span>
            </div>

            {cases === null ? (
              <p className="mt-6 text-slate">{UI_STRINGS.activity.loading[language]}</p>
            ) : visible.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-ink/20 p-6 text-slate">
                {selectedArea ? EXPERIENCE.landscape.noCasesInArea[language] : UI_STRINGS.activity.empty[language]}
              </p>
            ) : (
              <ul className="-mx-3 mt-4 divide-y divide-ink/10">
                {visible.map((c) => (
                  <CaseRow
                    key={c.id}
                    caseItem={c}
                    category={community.categories.find((cat) => cat.id === c.categoryId)}
                    language={language}
                    selected={selectedCase?.id === c.id}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function chip(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
    active ? "bg-teal text-cream" : "border border-ink/15 text-ink hover:bg-mint"
  }`;
}
