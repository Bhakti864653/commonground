"use client";

import { useEffect, useState } from "react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { listCasesForActivity } from "@/lib/store/actions";
import { CaseCard } from "@/components/dashboard/CaseCard";
import type { Case } from "@/lib/schema/report";

type TypeFilter = "all" | "report" | "proposal";

export default function ActivityPage() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const t = UI_STRINGS.activity;
  const [cases, setCases] = useState<Case[] | null>(null);
  const [filter, setFilter] = useState<TypeFilter>("all");

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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink md:text-3xl">{t.heading[language]}</h1>
        <p className="mt-1 text-sm text-slate">{t.subheading[language]}</p>
      </div>

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

      {cases === null ? (
        <p className="text-sm text-slate">{t.loading[language]}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-slate">{t.empty[language]}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((c) => {
            const category = community.categories.find((cat) => cat.id === c.categoryId);
            if (!category) return null;
            return <CaseCard key={c.id} caseItem={c} category={category} language={language} />;
          })}
        </div>
      )}
    </div>
  );
}
