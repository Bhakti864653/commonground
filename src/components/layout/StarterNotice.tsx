"use client";

import { ShieldAlert } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { INFO } from "@/lib/i18n/community-info";
import { fill } from "@/lib/i18n/experience";
import { usePlaces } from "@/lib/places/context";

/**
 * Shown at the top of every page while a starter community is active: residents can report
 * there, but nobody reviews those reports yet and no local contacts have been checked — they
 * must never mistake it for a moderated community.
 */
export function StarterNotice() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const { activePlace } = usePlaces();
  if (activePlace.kind !== "community" || community.status !== "starter") return null;
  const t = INFO.starter;

  return (
    <section
      aria-labelledby="starter-notice-title"
      className="mb-8 flex items-start gap-3 rounded-[20px] border-2 border-ink bg-status-review p-4 text-ink md:p-5"
    >
      <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <h2 id="starter-notice-title" className="text-xl md:text-2xl">
          {t.title[language]}
        </h2>
        <p className="mt-1 text-sm">{fill(t.body[language], { place: community.displayName })}</p>
      </div>
    </section>
  );
}
