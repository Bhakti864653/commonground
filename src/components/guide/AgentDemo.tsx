"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpenCheck,
  ClipboardList,
  FilePenLine,
  Hand,
  MapPinned,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipForward,
  Tags,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { EXPERIENCE, fill } from "@/lib/i18n/experience";
import { listCasesForActivity } from "@/lib/store/actions";
import type { PublicCase } from "@/lib/schema/report";
import { LogoMark } from "@/components/layout/Logo";
import { labelOf } from "@/lib/i18n/labels";

const STEP_ICONS: Record<string, LucideIcon> = {
  community: MapPinned,
  missing: ClipboardList,
  duplicates: Search,
  classify: Tags,
  sources: BookOpenCheck,
  draft: FilePenLine,
  confirm: Hand,
  moderator: UserCheck,
};

type Kind = "tool" | "evidence" | "safety" | "approval";

const KIND_STYLE: Record<Kind, string> = {
  tool: "bg-mint text-teal",
  evidence: "bg-blue text-ink",
  safety: "bg-meadow text-forest",
  approval: "bg-yellow text-on-yellow",
};

const PLAY_INTERVAL_MS = 1800;

/**
 * A replayed walkthrough of the Guide's real pipeline with one example message. The steps are
 * scripted (it's a demonstration, and says so), but the duplicate-check evidence is computed
 * from this community's actual public case list — the same data the real
 * `search_similar_cases` tool reads. It shows tool actions, evidence, safety checks, and
 * approval points; never any model's private reasoning.
 */
export function AgentDemo() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const t = EXPERIENCE.demo;
  const [cases, setCases] = useState<PublicCase[]>([]);
  const [shown, setShown] = useState(1);
  const [playing, setPlaying] = useState(false);
  const total = t.steps.length;

  useEffect(() => {
    let cancelled = false;
    listCasesForActivity(community.id).then((result) => {
      if (!cancelled) setCases(result);
    });
    return () => {
      cancelled = true;
    };
  }, [community.id]);

  // Playback ends by itself at the last step — derived, so there's no state to keep in sync.
  const isPlaying = playing && shown < total;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => setShown((n) => Math.min(total, n + 1)), PLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, total]);

  // The example: the community's drainage category (or its first one) in its northern area.
  const category = community.categories.find((c) => /flood|drain/.test(c.id)) ?? community.categories[0];
  const area = community.areas.find((a) => a.id === "norte") ?? community.areas[0];
  const categoryLabel = labelOf(category, language);
  const areaLabel = labelOf(area, language);
  const similar = cases.filter(
    (c) => c.categoryId === category.id && c.approximateArea.areaId === area.id && c.status !== "closed",
  );

  const reached = (key: string) => t.steps.findIndex((s) => s.key === key) < shown;

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      {/* What the resident sees: their message, and the draft filling in. */}
      <div className="flex flex-col gap-5 lg:col-span-5">
        <div className="lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-5">
          <figure className="rounded-[2rem] bg-teal p-6 text-cream">
            <figcaption className="text-sm text-cream/75">{t.residentSays[language]}</figcaption>
            <blockquote className="mt-2 font-heading text-xl leading-relaxed">
              “{fill(t.sampleMessage[language], { area: areaLabel })}”
            </blockquote>
          </figure>

          <section className="mt-5 rounded-[2rem] border-2 border-dashed border-ink/20 p-6 lg:mt-0" aria-live="polite">
            <h2 className="flex items-center gap-2 text-lg text-ink">
              <FilePenLine aria-hidden="true" className="h-5 w-5 text-teal" />
              {t.draftPreview[language]}
            </h2>
            {!reached("classify") ? (
              <p className="mt-3 text-slate">{t.draftEmpty[language]}</p>
            ) : (
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-slate">{t.draftFields.type[language]}</dt>
                <dd className="cg-arrive font-medium text-ink">{EXPERIENCE.landscape.markerLegend.report[language]}</dd>
                <dt className="text-slate">{t.draftFields.category[language]}</dt>
                <dd className="cg-arrive font-medium text-ink">{categoryLabel}</dd>
                <dt className="text-slate">{t.draftFields.area[language]}</dt>
                <dd className="cg-arrive font-medium text-ink">{areaLabel}</dd>
                <dt className="text-slate">{t.draftFields.duplicates[language]}</dt>
                <dd className="cg-arrive font-medium text-ink">{similar.length}</dd>
              </dl>
            )}
            {reached("draft") && (
              <p className="cg-arrive mt-4 inline-flex items-center gap-1.5 rounded-full bg-yellow px-3 py-1 text-sm font-medium text-on-yellow">
                <Hand aria-hidden="true" className="h-4 w-4" />
                {t.draftNotSent[language]}
              </p>
            )}
          </section>
        </div>
      </div>

      {/* What the system did, step by step. */}
      <div className="lg:col-span-7">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShown((n) => Math.min(total, n + 1))} disabled={shown >= total} className={controlClass(true)}>
            <SkipForward aria-hidden="true" className="h-4 w-4" />
            {t.controls.next[language]}
          </button>
          <button
            type="button"
            onClick={() => {
              if (shown >= total) setShown(1);
              setPlaying(!isPlaying);
            }}
            className={controlClass(false)}
          >
            {isPlaying ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
            {isPlaying ? t.controls.pause[language] : t.controls.play[language]}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setShown(1);
            }}
            className={controlClass(false)}
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            {t.controls.restart[language]}
          </button>
          <span className="ml-auto text-sm tabular-nums text-slate" aria-live="polite">
            {fill(t.controls.progress[language], { n: shown, total })}
          </span>
        </div>

        <ol className="relative flex flex-col gap-4">
          <span aria-hidden="true" className="absolute bottom-4 left-[1.35rem] top-4 w-[3px] rounded-full bg-ink/10" />
          {t.steps.map((step, i) => {
            const Icon = STEP_ICONS[step.key];
            const isShown = i < shown;
            const isCurrent = i === shown - 1;
            const items: { kind: Kind; text: string }[] = [];
            if ("action" in step) items.push({ kind: "tool", text: fill(step.action[language], { community: community.displayName, category: categoryLabel, area: areaLabel }) });
            if (step.key === "duplicates") {
              items.push({
                kind: "evidence",
                text: similar.length === 0 ? step.evidenceNone[language] : fill(step.evidenceSome[language], { count: similar.length }),
              });
            }
            if (step.key === "sources") {
              items.push({ kind: "evidence", text: step.evidenceNone[language] });
            }
            if ("safety" in step) items.push({ kind: "safety", text: step.safety[language] });
            if ("approval" in step) items.push({ kind: "approval", text: step.approval[language] });
            const isApproval = "approval" in step;

            return (
              <li key={step.key} className="relative grid grid-cols-[2.75rem_1fr] gap-x-4">
                <span
                  aria-hidden="true"
                  className={`z-10 flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                    !isShown
                      ? "border-2 border-dashed border-ink/20 bg-cream text-slate"
                      : isApproval
                        ? "bg-yellow text-on-yellow"
                        : "bg-teal text-cream"
                  } ${isCurrent ? "ring-4 ring-turquoise/30" : ""}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className={`rounded-2xl px-4 py-3 ${isCurrent ? "cg-arrive bg-surface shadow-[0_14px_30px_-22px_rgba(19,38,31,0.5)]" : ""}`}>
                  <h3 className={`text-lg ${isShown ? "text-ink" : "text-slate"}`}>
                    <span className="sr-only">{i + 1}. </span>
                    {step.title[language]}
                  </h3>
                  {isShown && (
                    <ul className="mt-2 flex flex-col gap-2">
                      {items.map((item) => (
                        <li key={item.kind + item.text} className="flex flex-col items-start gap-1 text-sm sm:flex-row sm:gap-3">
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLE[item.kind]}`}>
                            {t.kinds[item.kind][language]}
                          </span>
                          <span className="text-ink/85">{item.text}</span>
                        </li>
                      ))}
                      {step.key === "duplicates" && similar.length > 0 && (
                        <li>
                          <ul className="ml-0 mt-1 flex flex-col gap-1 sm:ml-[5.5rem]">
                            {similar.map((c) => (
                              <li key={c.id} className="text-sm">
                                <Link href={`/cases/${c.publicCaseNumber}`} className="font-medium tabular-nums text-teal underline underline-offset-4">
                                  {c.publicCaseNumber}
                                </Link>{" "}
                                <span className="text-slate">{c.description.slice(0, 80)}{c.description.length > 80 ? "…" : ""}</span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-[2rem] bg-surface p-6">
          <LogoMark className="h-10 w-10 shrink-0" />
          <p className="min-w-0 flex-1 text-sm text-slate">{t.neverShown[language]}</p>
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 rounded-full bg-teal px-4 py-2.5 text-sm font-medium text-cream hover:bg-teal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
          >
            <BadgeCheck aria-hidden="true" className="h-4 w-4" />
            {t.tryIt[language]}
          </Link>
        </div>
      </div>
    </div>
  );
}

function controlClass(primary: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-40 ${
    primary ? "bg-teal text-cream hover:bg-teal/90" : "border border-ink/15 text-ink hover:bg-mint"
  }`;
}
