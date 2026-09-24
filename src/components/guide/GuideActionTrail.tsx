"use client";

import Link from "next/link";
import { BookOpenCheck, ClipboardList, FilePenLine, Hand, Info, MapPinned, ShieldAlert, ShieldCheck, Tags, UserCheck, type LucideIcon } from "lucide-react";
import { EXPERIENCE, fill } from "@/lib/i18n/experience";
import type { Language } from "@/lib/i18n/dictionary";

export type TrailState = "done" | "active" | "pending" | "approval" | "flagged" | "info";

export type TrailStep = {
  key: string;
  Icon: LucideIcon;
  title: string;
  detail: string;
  state: TrailState;
};

const STATE_STYLE: Record<TrailState, { dot: string; label: keyof typeof EXPERIENCE.guide.status }> = {
  done: { dot: "bg-teal text-cream", label: "done" },
  active: { dot: "bg-turquoise text-cream ring-4 ring-turquoise/20", label: "active" },
  pending: { dot: "border-2 border-dashed border-ink/25 bg-cream text-slate", label: "pending" },
  approval: { dot: "bg-yellow text-on-yellow", label: "approval" },
  flagged: { dot: "bg-coral text-cream", label: "flagged" },
  info: { dot: "bg-blue text-ink", label: "info" },
};

/**
 * Builds the live trail strictly from what the page can confirm: the active community, the
 * emergency check's result (returned by the server), whether a draft exists and its validated
 * fields, and the community's configured sources. Nothing about the model's private reasoning,
 * and nothing the Guide's response doesn't actually report (such as its duplicate search).
 */
export function buildGuideTrail({
  language,
  communityName,
  trustedSourceCount,
  hasUserMessage,
  waitingForReply,
  lastReplyWasEmergency,
  draft,
}: {
  language: Language;
  communityName: string;
  trustedSourceCount: number;
  hasUserMessage: boolean;
  waitingForReply: boolean;
  lastReplyWasEmergency: boolean;
  draft: { summary: string; areaLabel: string } | null;
}): TrailStep[] {
  const s = EXPERIENCE.guide.steps;
  return [
    {
      key: "community",
      Icon: MapPinned,
      title: s.community.title[language],
      detail: fill(s.community.detail[language], { community: communityName }),
      state: "done",
    },
    {
      key: "safety",
      Icon: lastReplyWasEmergency ? ShieldAlert : ShieldCheck,
      title: s.safety.title[language],
      detail: !hasUserMessage
        ? s.safety.waiting[language]
        : lastReplyWasEmergency
          ? s.safety.flagged[language]
          : waitingForReply
            ? s.safety.waiting[language]
            : s.safety.clear[language],
      state: !hasUserMessage ? "pending" : waitingForReply ? "active" : lastReplyWasEmergency ? "flagged" : "done",
    },
    {
      key: "details",
      Icon: ClipboardList,
      title: s.details.title[language],
      detail: !hasUserMessage ? s.details.waiting[language] : draft ? s.details.done[language] : s.details.inProgress[language],
      state: !hasUserMessage ? "pending" : draft ? "done" : "active",
    },
    {
      key: "classify",
      Icon: Tags,
      title: s.classify.title[language],
      detail: draft ? `${draft.summary}. ${draft.areaLabel}.` : s.classify.waiting[language],
      state: draft ? "done" : "pending",
    },
    {
      key: "sources",
      Icon: BookOpenCheck,
      title: s.sources.title[language],
      detail: trustedSourceCount === 0 ? s.sources.none[language] : fill(s.sources.some[language], { count: trustedSourceCount }),
      state: "info",
    },
    {
      key: "draft",
      Icon: FilePenLine,
      title: s.draft.title[language],
      detail: draft ? s.draft.done[language] : s.draft.waiting[language],
      state: draft ? "done" : "pending",
    },
    {
      key: "confirm",
      Icon: Hand,
      title: s.confirm.title[language],
      detail: s.confirm.detail[language],
      state: "approval",
    },
    {
      key: "moderator",
      Icon: UserCheck,
      title: s.moderator.title[language],
      detail: s.moderator.detail[language],
      state: "approval",
    },
  ];
}

export function GuideActionTrail({ steps, language }: { steps: TrailStep[]; language: Language }) {
  const t = EXPERIENCE.guide;
  return (
    <section aria-labelledby="guide-trail-heading" className="border-t border-line px-2.5 pt-7 min-[1000px]:pl-9">
      <h2 id="guide-trail-heading" className="text-[2rem] text-ink">
        {t.trailHeading[language]}
      </h2>
      <p className="mt-1 text-sm text-slate">{t.trailIntro[language]}</p>
      <ol className="relative mt-6 flex flex-col gap-5" aria-live="polite">
        <span aria-hidden="true" className="absolute bottom-3 left-[1.05rem] top-3 w-px bg-ink/15" />
        {steps.map((step) => {
          const style = STATE_STYLE[step.state];
          const Icon = step.state === "info" ? Info : step.Icon;
          return (
            <li key={step.key} className="relative grid grid-cols-[2.2rem_1fr] gap-x-3">
              <span aria-hidden="true" className={`z-10 flex h-[2.1rem] w-[2.1rem] items-center justify-center rounded-full ${style.dot}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className={step.state === "pending" ? "opacity-70" : ""}>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-ink">{step.title}</span>
                  <span className="text-xs text-slate">{t.status[style.label][language]}</span>
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink/75">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <Link
        href="/guide/how-it-works"
        className="mt-6 inline-block text-sm font-medium text-teal underline decoration-teal/40 underline-offset-4 hover:decoration-teal"
      >
        {t.trailDemoLink[language]}
      </Link>
    </section>
  );
}
