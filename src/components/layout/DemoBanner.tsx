"use client";

import { Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { FIELD } from "@/lib/i18n/field-notes";

/**
 * The site-wide notice that CommonGround is an independent student demo: it sends nothing to any
 * authority and is not affiliated with the Alcaldía. Rendered by the root layout, so it sits above
 * every page — the landing page, the resident app, and /admin alike.
 */
export function DemoBanner() {
  const { language } = useLanguage();

  return (
    <div role="note" className="border-b border-line bg-lime px-[18px] py-2 text-[#172b25] md:px-[clamp(20px,4vw,65px)]">
      <p className="mx-auto flex max-w-[1700px] items-start gap-2 text-[0.8rem] font-semibold leading-snug">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{FIELD.shell.demoBanner[language]}</span>
      </p>
    </div>
  );
}
