import { UI_STRINGS } from "@/lib/i18n/dictionary";
import type { Language } from "@/lib/i18n/dictionary";
import { FIELD } from "@/lib/i18n/field-notes";

/**
 * A leaf-shaped parcel holding two overlapping circles — two neighbors' views meeting on
 * common ground. Stroked in lime on the dark sidebar; `tone="ink"` for light backgrounds.
 */
export function LogoMark({ className, tone = "lime" }: { className?: string; tone?: "lime" | "ink" }) {
  const stroke = tone === "lime" ? "var(--lime)" : "var(--teal)";
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <g transform="rotate(-24 20 20)" fill="none" stroke={stroke} strokeWidth="3">
        <clipPath id={`cg-leaf-${tone}`}>
          <path d="M8 3H20A17 17 0 0 1 37 20A17 17 0 0 1 20 37A17 17 0 0 1 3 20V8A5 5 0 0 1 8 3Z" />
        </clipPath>
        <path d="M8 3H20A17 17 0 0 1 37 20A17 17 0 0 1 20 37A17 17 0 0 1 3 20V8A5 5 0 0 1 8 3Z" />
        <g clipPath={`url(#cg-leaf-${tone})`}>
          <circle cx="1" cy="27" r="16" />
          <circle cx="39" cy="27" r="16" />
        </g>
      </g>
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
