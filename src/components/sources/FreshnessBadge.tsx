"use client";

import { BadgeCheck, CircleHelp, Clock } from "lucide-react";
import type { Language } from "@/lib/i18n/languages";
import { INFO } from "@/lib/i18n/community-info";
import type { Freshness } from "@/lib/sources/freshness";

const STYLE: Record<Freshness, { icon: typeof BadgeCheck; className: string }> = {
  current: { icon: BadgeCheck, className: "bg-status-resolved" },
  review_due: { icon: Clock, className: "bg-status-review" },
  unverified: { icon: CircleHelp, className: "bg-status-neutral" },
};

/**
 * Never color alone: every state is an icon plus a text label, and the explanation is part of the
 * accessible name, so a screen reader hears what the state means, not just its name.
 */
export function FreshnessBadge({ state, language }: { state: Freshness; language: Language }) {
  const t = INFO.resources.freshness[state];
  const { icon: Icon, className } = STYLE[state];
  return (
    <span
      data-freshness={state}
      title={t.explain[language]}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-extrabold text-ink ${className}`}
    >
      <Icon aria-hidden="true" className="h-3 w-3 shrink-0" />
      {t.label[language]}
      <span className="sr-only">: {t.explain[language]}</span>
    </span>
  );
}
