import { UI_STRINGS } from "@/lib/i18n/dictionary";
import type { Language } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";

/**
 * Two homes whose roofs overlap; the space they share is filled in lime — neighbors meeting on
 * common ground. Cream outlines for the always-dark sidebar; `tone="ink"` for page backgrounds.
 */
export function LogoMark({ className, tone = "lime" }: { className?: string; tone?: "lime" | "ink" }) {
  const outline = tone === "lime" ? "#f8f8f1" : "var(--teal)";
  const shared = tone === "lime" ? "var(--lime)" : "var(--lime-deep)";
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M14 20L20.5 15L26 20V34H14Z" fill={shared} />
      <g fill="none" stroke={outline} strokeWidth="3" strokeLinejoin="round">
        <path d="M4 34V20L15 10L26 20V34Z" />
        <path d="M14 34V20L25 10L36 20V34Z" />
      </g>
      <path d="M4 34H36" stroke={shared} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Stacked two-line wordmark from the reference: "Common / Ground." */
export function Wordmark({ language, className }: { language: Language; className?: string }) {
  return (
    <span className={`flex items-start gap-3 ${className ?? ""}`} aria-label={UI_STRINGS.wordmark[language]}>
      <LogoMark className="mt-0.5 h-9 w-9 shrink-0" />
      <span aria-hidden="true" className="text-[1.5rem] font-extrabold leading-[0.84] tracking-[-0.085em] text-[#f8f8f1]">
        {FIELD.shell.wordmarkTop[language]}
        <br />
        {FIELD.shell.wordmarkBottom[language]}
        <span className="text-lime">.</span>
      </span>
    </span>
  );
}
