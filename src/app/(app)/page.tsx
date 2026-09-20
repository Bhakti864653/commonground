"use client";

import Link from "next/link";
import { Info, MapPin } from "lucide-react";
import { useCommunity } from "@/lib/community/context";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { getCategoryIcon } from "@/components/icons/category-icon-map";
import { CaseLookupForm } from "@/components/case/CaseLookupForm";

export default function Home() {
  const { community } = useCommunity();
  const { language } = useLanguage();
  const t = UI_STRINGS.home;
  const isFictional = community.status === "demo";

  const actionCards = [
    { ...t.actions.report, href: "/report/new?type=report" },
    { ...t.actions.propose, href: "/report/new?type=proposal" },
    { ...t.actions.learn, href: "/how-it-works" },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10 md:px-8">
      {/* 1. What CommonGround is */}
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-ink md:text-4xl">{t.tagline[language]}</h1>
        <p className="text-base leading-relaxed text-slate">{t.intro[language]}</p>
      </section>

      {/* 2. Which community is active */}
      <section className="rounded-lg border border-ink/10 bg-mint/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
          {t.activeCommunityHeading[language]}
        </h2>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="text-xl font-semibold text-ink">{community.displayName}</p>
          {isFictional && (
            <span className="shrink-0 rounded-full bg-coral/15 px-2.5 py-0.5 text-xs font-medium text-coral">
              {UI_STRINGS.fictionalBadge[language]}
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate">
          <MapPin aria-hidden="true" className="h-4 w-4" />
          {community.country}
          {community.region ? `, ${community.region}` : ""}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {community.categories.map((category) => {
            const Icon = getCategoryIcon(category.icon);
            return (
              <li
                key={category.id}
                className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-cream px-3 py-1 text-xs font-medium text-ink"
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5 text-teal" />
                {language === "es" ? category.labelEs : category.label}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm italic text-slate">{t.pilotQuestion[language]}</p>
      </section>

      {/* 3. What the user can do now */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">{t.actionsHeading[language]}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {actionCards.map((action) => {
            const card = (
              <div className="flex h-full flex-col gap-1 rounded-lg border border-ink/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{action.title[language]}</p>
                  {action.href === null && (
                    <span className="shrink-0 text-[11px] font-medium text-slate">
                      {UI_STRINGS.comingSoon[language]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate">{action.body[language]}</p>
              </div>
            );
            return action.href ? (
              <Link
                key={action.title.en}
                href={action.href}
                className="rounded-lg transition-colors hover:bg-mint/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              >
                {card}
              </Link>
            ) : (
              <div key={action.title.en} aria-disabled="true" className="opacity-80">
                {card}
              </div>
            );
          })}
          <div className="flex h-full flex-col gap-1 rounded-lg border border-ink/10 p-4">
            <p className="font-semibold text-ink">{t.actions.track.title[language]}</p>
            <p className="text-sm text-slate">{t.actions.track.body[language]}</p>
            <CaseLookupForm />
          </div>
        </div>
      </section>

      {/* What CommonGround is not */}
      <section className="rounded-lg border border-ink/10 bg-blue/50 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Info aria-hidden="true" className="h-4 w-4 text-slate" />
          {t.disclaimerHeading[language]}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">{t.disclaimerBody[language]}</p>
      </section>
    </div>
  );
}
