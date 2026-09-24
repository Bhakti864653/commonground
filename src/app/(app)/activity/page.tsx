"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, TrendingUp, X } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";
import { fill } from "@/lib/i18n/experience";
import { usePlaces } from "@/lib/places/context";
import { getTrendsForActivity, listCasesForActivity } from "@/lib/store/actions";
import { ReportStatusSchema, STATUS_LABELS, type PublicCase, type ReportStatus } from "@/lib/schema/report";
import type { Trend } from "@/lib/insights/trends";
import { filterCases, type CaseFilters } from "@/lib/explore/filter-cases";
import { CaseRow } from "@/components/journey/CaseRow";
import { UnconfiguredPlace } from "@/components/map/UnconfiguredPlace";
import { CaseLookupForm } from "@/components/case/CaseLookupForm";

const EMPTY_FILTERS: CaseFilters = { query: "", type: "all", status: "all", categoryId: "all", areaId: "all" };

export default function ExplorePage() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const { activePlace } = usePlaces();
  const t = FIELD.explore;
  const [cases, setCases] = useState<PublicCase[] | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [filters, setFilters] = useState<CaseFilters>(EMPTY_FILTERS);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCasesForActivity(community.id), getTrendsForActivity(community.id)]).then(([caseResult, trendResult]) => {
      if (!cancelled) {
        setCases([...caseResult].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setTrends(trendResult);
        setFilters(EMPTY_FILTERS);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [community.id]);

  const visible = useMemo(() => (cases ? filterCases(cases, filters, community) : []), [cases, filters, community]);
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const set = <K extends keyof CaseFilters>(key: K, value: CaseFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  if (activePlace.kind === "unconfigured") {
    return (
      <div>
        <PageHead language={language} />
        <UnconfiguredPlace />
      </div>
    );
  }

  return (
    <div>
      <PageHead language={language} />

      <div className="mb-[22px] flex flex-wrap items-center gap-2" role="search">
        <label className="relative min-w-[175px] flex-1 sm:flex-none">
          <span className="sr-only">{t.search[language]}</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder={t.search[language]}
            className={`${field} w-full pl-9`}
          />
        </label>
        <Select label={t.allTypes[language]} value={filters.type} onChange={(v) => set("type", v as CaseFilters["type"])}>
          <option value="all">{t.allTypes[language]}</option>
          <option value="report">{t.reports[language]}</option>
          <option value="proposal">{t.proposals[language]}</option>
        </Select>
        <Select label={t.allStatuses[language]} value={filters.status} onChange={(v) => set("status", v as ReportStatus | "all")}>
          <option value="all">{t.allStatuses[language]}</option>
          {ReportStatusSchema.options.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s][language]}
            </option>
          ))}
        </Select>
        <Select label={t.allCategories[language]} value={filters.categoryId} onChange={(v) => set("categoryId", v)}>
          <option value="all">{t.allCategories[language]}</option>
          {community.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {language === "es" ? c.labelEs : c.label}
            </option>
          ))}
        </Select>
        <Select label={t.allAreas[language]} value={filters.areaId} onChange={(v) => set("areaId", v)}>
          <option value="all">{t.allAreas[language]}</option>
          {community.areas.map((a) => (
            <option key={a.id} value={a.id}>
              {language === "es" ? a.labelEs : a.label}
            </option>
          ))}
          <option value="none">{t.noArea[language]}</option>
        </Select>
        {isFiltered && (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[0.85rem] font-bold text-ink underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
            {t.clear[language]}
          </button>
        )}
        <span className="ml-auto text-[0.85rem] font-bold tabular-nums text-slate" aria-live="polite">
          {visible.length === 1 ? t.resultsOne[language] : fill(t.results[language], { count: visible.length })}
        </span>
      </div>

      {trends.length > 0 && (
        <ul className="mb-6 flex flex-col gap-1.5">
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
                  onClick={() => setFilters({ ...EMPTY_FILTERS, categoryId: trend.categoryId, areaId: trend.areaId ?? "all" })}
                  className="inline-flex items-start gap-2 rounded-full bg-periwinkle/70 px-3.5 py-2 text-left text-[0.85rem] font-semibold text-ink hover:bg-periwinkle focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
                >
                  <TrendingUp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-extrabold">{t.patterns[language]}:</span> {sentence}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {cases === null ? (
        <p className="py-9 text-slate">{UI_STRINGS.activity.loading[language]}</p>
      ) : visible.length === 0 ? (
        <p className="border-t border-[#9faf9d] py-9 text-slate">{t.empty[language]}</p>
      ) : (
        <ul className="border-t border-[#9faf9d]">
          {visible.map((c) => (
            <CaseRow
              key={c.id}
              caseItem={c}
              index={cases.indexOf(c)}
              category={community.categories.find((cat) => cat.id === c.categoryId)}
              language={language}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

const field =
  "min-h-[42px] rounded-full border border-line bg-surface px-3.5 py-2.5 text-[0.85rem] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${field} pr-8`}>
      {children}
    </select>
  );
}

function PageHead({ language }: { language: "es" | "en" }) {
  const t = FIELD.explore;
  return (
    <header className="mb-7 flex flex-col gap-6 min-[1000px]:flex-row min-[1000px]:items-end min-[1000px]:justify-between">
      <div>
        <p className="cg-eyebrow">{t.caps[language]}</p>
        <h1 className="mt-4 text-[clamp(3.2rem,6.1vw,6.4rem)] leading-[0.95] tracking-[-0.06em] text-ink">{t.title[language]}</h1>
        <p className="mt-3 max-w-[590px] text-slate">{t.sub[language]}</p>
      </div>
      {/* Straight to a case by its number — including one no longer in this list. */}
      <div className="w-full max-w-sm">
        <p className="mb-2 text-[0.83rem] font-extrabold text-ink">{UI_STRINGS.caseLookup.heading[language]}</p>
        <CaseLookupForm />
      </div>
    </header>
  );
}
