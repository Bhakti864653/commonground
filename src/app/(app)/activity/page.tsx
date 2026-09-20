"use client";

import { useEffect, useState } from "react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { listCasesForActivity } from "@/lib/store/actions";
import { CaseList } from "@/components/dashboard/CaseList";
import { CommunityPulse } from "@/components/pulse/CommunityPulse";
import type { Case } from "@/lib/schema/report";

type TypeFilter = "all" | "report" | "proposal";
type ViewMode = "list" | "pulse";

export default function ActivityPage() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const t = UI_STRINGS.activity;
  const pulseT = UI_STRINGS.pulse;
  const [cases, setCases] = useState<Case[] | null>(null);
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [view, setView] = useState<ViewMode>("list");

  useEffect(() => {
    let cancelled = false;
    listCasesForActivity(community.id).then((result) => {
      if (!cancelled) setCases(result);
    });
    return () => {
      cancelled = true;
    };
  }, [community.id]);

  const visible = cases?.filter((c) => filter === "all" || c.type === filter) ?? [];

  const filters: { key: TypeFilter; label: string }[] = [
    { key: "all", label: t.filterAll[language] },
    { key: "report", label: UI_STRINGS.reportFlow.typeStep.report.title[language] },
    { key: "proposal", label: UI_STRINGS.reportFlow.typeStep.proposal.title[language] },
  ];

  const views: { key: ViewMode; label: string }[] = [
    { key: "list", label: pulseT.toggleList[language] },
    { key: "pulse", label: pulseT.toggleView[language] },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink md:text-3xl">{t.heading[language]}</h1>
        <p className="mt-1 text-sm text-slate">{t.subheading[language]}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label={t.heading[language]}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                filter === f.key ? "bg-teal text-cream" : "border border-ink/15 text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List is the default; 3D is an optional toggle, never the default — DESIGN_SYSTEM.md */}
        <div className="flex gap-1 rounded-full border border-ink/15 p-0.5" role="group">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                view === v.key ? "bg-teal text-cream" : "text-ink"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {cases === null ? (
        <p className="text-sm text-slate">{t.loading[language]}</p>
      ) : view === "list" ? (
        <CaseList
          cases={visible}
          community={community}
          language={language}
          emptyMessage={t.empty[language]}
        />
      ) : (
        <CommunityPulse
          cases={visible}
          community={community}
          language={language}
          emptyMessage={t.empty[language]}
          onViewAsList={() => setView("list")}
        />
      )}
    </div>
  );
}
