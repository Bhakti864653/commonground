import { EXPERIENCE } from "@/lib/i18n/experience";
import type { Language } from "@/lib/i18n/dictionary";
import { STATUS_LABELS } from "@/lib/schema/report";

/** Shape = type, color = where it stands. Both are named in text, so neither is the only signal. */
export function LandscapeLegend({ language }: { language: Language }) {
  const t = EXPERIENCE.landscape.markerLegend;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate" aria-label={EXPERIENCE.landscape.legendLabel[language]}>
      <li className="flex items-center gap-1.5">
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        </svg>
        {t.report[language]}
      </li>
      <li className="flex items-center gap-1.5">
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
          <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="var(--turquoise)" />
        </svg>
        {t.proposal[language]}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-yellow" aria-hidden="true" />
        {STATUS_LABELS.under_review[language]}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-slate" aria-hidden="true" />
        {EXPERIENCE.landscape.laterStages[language]}
      </li>
    </ul>
  );
}
