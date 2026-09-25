"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CircleDashed,
  EyeOff,
  Landmark,
  MapPin,
  MapPinOff,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { LANDING } from "@/lib/i18n/landing";
import { fill } from "@/lib/i18n/experience";
import { LANGUAGES } from "@/lib/i18n/languages";
import { LogoMark } from "@/components/layout/Logo";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { FieldMapIllustration } from "./FieldMapIllustration";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";
const primaryButton = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[0.95rem] font-extrabold text-paper transition-colors hover:bg-ink/85 ${focus}`;
const secondaryButton = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-ink px-6 py-3 text-[0.95rem] font-extrabold text-ink transition-colors hover:bg-mint ${focus}`;
const section = "mx-auto w-full max-w-[1280px] px-4 md:px-10";

const PRIVACY_ICONS = [EyeOff, MapPinOff, CircleDashed, BadgeCheck, Landmark];

/**
 * The public introduction at "/". Deliberately outside the app shell (no sidebar or bottom
 * nav). Every action leads to a real route, there is no sign-in of any kind, and accounts are
 * described only as a future plan.
 */
export function LandingPage() {
  const { language } = useLanguage();
  const t = LANDING;

  return (
    <div className="min-h-full overflow-x-clip bg-paper text-ink">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 font-bold text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.header.skip[language]}
      </a>

      {/* Header */}
      <header className={`${section} flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4 md:py-6`}>
        <Link href="/" aria-label={t.header.homeLabel[language]} className={`flex items-center gap-2.5 rounded-lg ${focus}`}>
          <LogoMark tone="ink" className="h-9 w-9 shrink-0" />
          <span aria-hidden="true" className="text-[1.35rem] font-extrabold tracking-[-0.07em]">
            CommonGround<span className="text-lime-deep">.</span>
          </span>
        </Link>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <LocaleSwitch />
          <ThemeToggle />
          <Link
            href="/home"
            className={`inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[0.82rem] font-extrabold text-paper hover:bg-ink/85 ${focus}`}
          >
            {t.header.exploreGuest[language]}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className={`${section} grid items-center gap-10 pb-16 pt-6 md:grid-cols-[1.05fr_0.95fr] md:gap-12 md:pb-24 md:pt-12`}>
          <div className="cg-arrive flex flex-col gap-6">
            <p className="cg-eyebrow">{t.hero.eyebrow[language]}</p>
            <h1 className="text-[clamp(2.7rem,8.5vw,5.6rem)] leading-[0.95] tracking-[-0.06em]">
              {UI_STRINGS.home.tagline[language]}
            </h1>
            <svg aria-hidden="true" viewBox="0 0 220 14" className="-mt-3 h-3 w-44 text-lime-deep">
              <path d="M3 9 C 50 2, 90 13, 140 6 S 200 4, 217 8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <p className="max-w-xl text-[1.08rem] leading-relaxed text-ink/80">{t.hero.body[language]}</p>
            <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
              <Link href="/home" className={primaryButton}>
                {t.hero.primary[language]}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link href="/report/new" className={secondaryButton}>
                {t.hero.secondary[language]}
              </Link>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <p className="flex items-center gap-2 font-bold">
                <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-teal" strokeWidth={3} />
                {t.hero.noAccount[language]}
              </p>
              <p className="flex items-center gap-2 text-slate">
                <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
                {t.hero.pilot[language]}
              </p>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[560px]">
            <FieldMapIllustration language={language} />
          </div>
        </section>

        {/* What CommonGround does — one connected journey. */}
        <section aria-labelledby="journey-title" className="border-y border-line bg-surface py-16 md:py-24">
          <div className={section}>
            <p className="cg-eyebrow">{t.journey.eyebrow[language]}</p>
            <h2 id="journey-title" className="mt-4 max-w-3xl text-[clamp(2.1rem,5vw,3.6rem)]">
              {t.journey.title[language]}
            </h2>
            <ol className="relative mt-12 flex flex-col gap-9 md:grid md:grid-cols-5 md:gap-6">
              {/* The path that connects the steps: down the side on phones, across on wider screens. */}
              <span aria-hidden="true" className="absolute bottom-6 left-[21px] top-6 border-l-2 border-dashed border-ink/40 md:bottom-auto md:left-6 md:right-6 md:top-[21px] md:border-l-0 md:border-t-2" />
              {t.journey.steps.map((step, i) => (
                <li key={step.title.en} className="relative flex gap-5 md:flex-col md:gap-4">
                  <span
                    aria-hidden="true"
                    className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink text-sm font-extrabold ${
                      i === 0 ? "bg-lime text-[#172b25]" : "bg-paper"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[1.7rem]">{step.title[language]}</h3>
                    <p className="mt-2 text-[0.95rem] leading-relaxed text-ink/75">{step.body[language]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The Guide */}
        <section aria-labelledby="guide-title" className={`${section} grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24`}>
          <div className="flex flex-col gap-5">
            <p className="cg-eyebrow">{t.guide.eyebrow[language]}</p>
            <h2 id="guide-title" className="text-[clamp(2.1rem,5vw,3.6rem)]">
              {t.guide.title[language]}
            </h2>
            <p className="max-w-lg leading-relaxed text-ink/80">{t.guide.intro[language]}</p>
            <Link href="/guide" className={`${secondaryButton} w-max`}>
              {t.guide.cta[language]}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative rotate-[0.6deg] rounded-[22px] border border-line bg-note p-6 shadow-[0_10px_30px_-18px_#17352655] md:p-8">
            <span aria-hidden="true" className="absolute -top-3 left-10 h-6 w-20 -rotate-3 rounded-sm bg-lime/80" />
            <ul className="flex flex-col gap-3.5">
              {t.guide.abilities.map((ability) => (
                <li key={ability.en} className="flex items-start gap-3 text-[0.98rem]">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-teal" strokeWidth={3} />
                  {ability[language]}
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-start gap-3 border-t border-dashed border-ink/30 pt-5 font-extrabold">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
              {t.guide.never[language]}
            </p>
          </div>
        </section>

        {/* Privacy and trust — on the deep-green band so it can't be missed. */}
        <section aria-labelledby="privacy-title" className="border-y border-line bg-sidebar py-16 text-[#f8f8f1] md:py-24">
          <div className={section}>
            <p className="cg-eyebrow !text-lime">{t.privacy.eyebrow[language]}</p>
            <h2 id="privacy-title" className="mt-4 max-w-3xl text-[clamp(2.1rem,5vw,3.6rem)]">
              {t.privacy.title[language]}
            </h2>
            <ul className="mt-10 grid gap-x-12 md:grid-cols-2">
              {t.privacy.points.map((point, i) => {
                const Icon = PRIVACY_ICONS[i];
                return (
                  <li key={point.title.en} className="flex gap-4 border-t border-sidebar-text/25 py-5">
                    <Icon aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-lime" />
                    <div>
                      <h3 className="text-[1.45rem]">{point.title[language]}</h3>
                      <p className="mt-1.5 leading-relaxed text-sidebar-text">{point.body[language]}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Local beginning, global architecture */}
        <section aria-labelledby="scale-title" className={`${section} grid gap-10 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24`}>
          <div className="flex flex-col gap-5">
            <p className="cg-eyebrow">{t.scale.eyebrow[language]}</p>
            <h2 id="scale-title" className="text-[clamp(2.1rem,5vw,3.6rem)]">
              {t.scale.title[language]}
            </h2>
            <p className="max-w-xl leading-relaxed text-ink/80">{t.scale.body[language]}</p>
          </div>
          <div className="flex flex-col gap-6 md:pt-10">
            <ul className="flex flex-wrap gap-2">
              {t.scale.configurable.map((item) => (
                <li key={item.en} className="rounded-full border border-ink/25 px-3.5 py-1.5 text-sm font-bold">
                  {item[language]}
                </li>
              ))}
            </ul>
            <div>
              <p className="text-sm font-bold">{fill(t.scale.languagesLabel[language], { count: LANGUAGES.length })}</p>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[1.05rem]">
                {LANGUAGES.map((l, i) => (
                  <li key={l.code} lang={l.htmlLang}>
                    {l.nativeName}
                    {i < LANGUAGES.length - 1 && <span aria-hidden="true" className="ml-3 text-slate">·</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Accounts — an honest note, not a form. */}
        <section aria-labelledby="accounts-title" className={`${section} pb-16 md:pb-24`}>
          <div className="max-w-3xl border-l-4 border-lime-deep py-1 pl-5">
            <h2 id="accounts-title" className="text-[1.6rem]">
              {t.accounts.title[language]}
            </h2>
            <p className="mt-2 leading-relaxed text-ink/80">{t.accounts.body[language]}</p>
          </div>
        </section>

        {/* Final actions */}
        <section aria-labelledby="final-title" className="border-t border-line bg-surface py-16 md:py-24">
          <div className={section}>
            <h2 id="final-title" className="text-[clamp(2.4rem,6vw,4.4rem)]">
              {t.final.title[language]}
            </h2>
            <ul className="mt-8 flex flex-col">
              {[
                { href: "/activity", label: t.final.activity },
                { href: "/report/new", label: t.final.report },
                { href: "/how-it-works", label: t.final.learn },
              ].map((action) => (
                <li key={action.href} className="border-t border-line last:border-b">
                  <Link
                    href={action.href}
                    className={`group flex items-center justify-between gap-4 py-5 text-[clamp(1.2rem,2.6vw,1.7rem)] font-extrabold tracking-[-0.03em] ${focus}`}
                  >
                    {action.label[language]}
                    <ArrowRight aria-hidden="true" className="h-6 w-6 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className={`${section} flex flex-col gap-2 py-10 text-[0.8rem] leading-relaxed text-slate`}>
        <p className="font-bold text-ink/85">{t.footer.notEmergency[language]}</p>
        <p lang="es">{UI_STRINGS.footer.independenceEs}</p>
        <p lang="en">{UI_STRINGS.footer.independenceEn}</p>
        <Link href="/resources" className={`w-max font-bold text-ink underline underline-offset-4 ${focus}`}>
          {t.footer.contacts[language]}
        </Link>
      </footer>
    </div>
  );
}
