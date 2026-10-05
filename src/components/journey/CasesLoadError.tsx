"use client";

import { RotateCw } from "lucide-react";
import type { Language } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";

/**
 * Shown when the case list couldn't be fetched, instead of a misleading "0 cases". The action is
 * a full reload, not a retry: the usual cause is a tab left open across a deploy, whose server
 * function ids no longer exist — calling them again would fail the same way.
 */
export function CasesLoadError({ language }: { language: Language }) {
  const t = FIELD.home;
  return (
    <div role="alert" className="flex flex-col items-start gap-3 border-t border-[#9faf9d] py-9 text-slate">
      <p>{t.loadError[language]}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[0.85rem] font-extrabold text-ink hover:bg-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
      >
        <RotateCw aria-hidden="true" className="h-4 w-4" />
        {t.reload[language]}
      </button>
    </div>
  );
}
