"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { UI_STRINGS } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";
import { INFO } from "@/lib/i18n/community-info";

/**
 * The reference's footnote plus the independence disclosure required on every page
 * (CLAUDE.md "Project identity"), which always shows in both languages.
 */
export function Footer() {
  const { language } = useLanguage();
  return (
    <footer className="mx-auto w-full max-w-[1700px] px-[17px] pb-28 md:px-[clamp(20px,4vw,65px)] md:pb-12">
      <div className="flex flex-col gap-2 border-t border-line pt-5 text-[0.78rem] leading-relaxed text-slate">
        <p className="font-semibold text-ink/80">{FIELD.shell.footnote[language]}</p>
        <p>{UI_STRINGS.footer.independenceEs}</p>
        <p>{UI_STRINGS.footer.independenceEn}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/how-it-works" className="w-max font-bold text-ink underline underline-offset-4">
            {FIELD.shell.howItWorks[language]}
          </Link>
          <Link href="/resources" className="w-max font-bold text-ink underline underline-offset-4">
            {INFO.resources.title[language]}
          </Link>
        </div>
      </div>
    </footer>
  );
}
