"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getWeeklySummaryForActivity } from "@/lib/store/actions";
import { FIELD } from "@/lib/i18n/field-notes";
import { fill } from "@/lib/i18n/experience";
import { dateLocale, type Language } from "@/lib/i18n/languages";
import { labelOf } from "@/lib/i18n/labels";
import type { CommunityConfig } from "@/lib/schema/community";

type Summary = Awaited<ReturnType<typeof getWeeklySummaryForActivity>>;

/**
 * The latest weekly summary a moderator published (drafted by the Summary Agent). Counts and
 * case numbers only. Shows nothing until one has been published.
 */
export function WeeklySummaryCard({ community, language }: { community: CommunityConfig; language: Language }) {
  const [loaded, setLoaded] = useState<{ communityId: string; summary: Summary } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getWeeklySummaryForActivity(community.id)
      .then((summary) => {
        if (!cancelled) setLoaded({ communityId: community.id, summary });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [community.id]);

  const summary = loaded?.communityId === community.id ? loaded.summary : null;
  if (!summary) return null;
  const t = FIELD.pipeline;
  const area = (id: string) => {
    const a = community.areas.find((x) => x.id === id);
    return a ? labelOf(a, language) : id;
  };
  const date = new Date(`${summary.weekStart}T12:00:00Z`).toLocaleDateString(dateLocale(language), { day: "numeric", month: "long" });

  return (
    <section aria-labelledby="weekly-summary" className="mb-[22px] rounded-[25px] bg-mint/50 p-[22px] text-ink">
      <p className="cg-caps">{t.weeklyCaps[language]}</p>
      <h2 id="weekly-summary" className="mt-2 text-[1.6rem]">
        {fill(t.weeklyTitle[language], { date })}
      </h2>
      {summary.highlight && <p className="mt-2 text-[0.95rem]">{summary.highlight[language]}</p>}
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {(
          [
            [t.newCases, summary.newCases],
            [t.resolved, summary.resolvedCases],
            [t.open, summary.openCases],
          ] as const
        ).map(([label, n]) => (
          <div key={label.en} className="rounded-[14px] bg-surface p-2">
            <dt className="text-[0.75rem] font-bold text-slate">{label[language]}</dt>
            <dd className="text-xl font-extrabold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
      {summary.oldestOpen.length > 0 && (
        <p className="mt-3 text-[0.88rem]">
          <span className="font-bold">{t.oldest[language]}:</span>{" "}
          {summary.oldestOpen.map((o, i) => (
            <span key={o.caseNumber}>
              {i > 0 && ", "}
              <Link href={`/cases/${o.caseNumber}`} className="font-bold underline underline-offset-2">
                {o.caseNumber}
              </Link>{" "}
              ({fill(t.days[language], { n: String(o.daysOpen) })})
            </span>
          ))}
        </p>
      )}
      {summary.hotspots.length > 0 && (
        <p className="mt-1 text-[0.88rem]">
          <span className="font-bold">{t.areas[language]}:</span> {summary.hotspots.map((h) => `${area(h.areaId)} (${h.count})`).join(", ")}
        </p>
      )}
      <p className="mt-3 text-[0.8rem] text-slate">{t.weeklyNote[language]}</p>
    </section>
  );
}
