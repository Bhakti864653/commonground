"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { INFO } from "@/lib/i18n/community-info";
import { fill } from "@/lib/i18n/experience";
import { dateLocale } from "@/lib/i18n/languages";
import { REMOVAL_REASON_LABELS, type ContentRemoval } from "@/lib/schema/report";

/**
 * What a visitor sees for a case a moderator took down: the number, the public reason, and the
 * date — never the removed text or photo (the page never receives them).
 */
export function CaseRemoved({ caseNumber, removal }: { caseNumber: string; removal: ContentRemoval }) {
  const { language } = useLanguage();
  const t = INFO.removed;
  const date = new Date(removal.removedAt).toLocaleDateString(dateLocale(language), { dateStyle: "long" });

  return (
    <div className="flex max-w-2xl flex-col gap-4 py-6">
      <p className="cg-caps">{caseNumber}</p>
      <h1 className="text-[clamp(2.4rem,5vw,4.2rem)] text-ink">{t.heading[language]}</h1>
      <p className="text-slate">{t.body[language]}</p>
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
        <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-coral" />
        <div className="text-sm">
          <p className="font-bold text-ink">
            {t.reason[language]}: {REMOVAL_REASON_LABELS[removal.reason][language]}
          </p>
          <p className="mt-1 text-slate">{fill(t.removedOn[language], { date })}</p>
        </div>
      </div>
      <Link
        href="/activity"
        className="w-max font-bold text-ink underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        {t.explore[language]}
      </Link>
    </div>
  );
}
