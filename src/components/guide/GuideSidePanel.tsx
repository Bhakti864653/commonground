"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Language } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";

/** The reference's open "The Guide can help" column, describing what the real Guide does. */
export function GuideSidePanel({ language }: { language: Language }) {
  const t = FIELD.guide;
  return (
    <section className="px-2.5 pt-5 min-[1000px]:pl-9">
      <p className="cg-caps">{t.sideCaps[language]}</p>
      <p className="my-8 font-heading text-[3.1rem] leading-none tracking-[-0.06em] text-ink">{t.sideBig[language]}</p>
      <p className="text-[0.88rem] text-slate">{t.sideHint[language]}</p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link
          href="/report/new"
          className="rounded-full border border-ink px-5 py-3 text-sm font-extrabold text-ink hover:bg-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        >
          {t.startDraft[language]}
        </Link>
        <Link
          href="/guide/how-it-works"
          className="inline-flex items-center gap-1.5 border-b border-ink pb-0.5 text-sm font-extrabold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal"
        >
          {t.seeHow[language]} <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
