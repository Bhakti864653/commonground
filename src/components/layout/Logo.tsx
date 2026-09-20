import { UI_STRINGS } from "@/lib/i18n/dictionary";
import type { Language } from "@/lib/i18n/dictionary";

/**
 * Two overlapping circles — the literal "common ground" shared between them — in the teal/mint
 * pair rather than a third accent, so the mark reads as belonging to the same system as the
 * category/status colors instead of a separate brand layer.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" className={className} aria-hidden="true">
      <circle cx="13" cy="10" r="9" fill="var(--mint)" />
      <circle cx="19" cy="10" r="9" fill="var(--teal)" fillOpacity="0.85" />
    </svg>
  );
}

export function Wordmark({ language, className }: { language: Language; className?: string }) {
  return (
    <span className={className}>
      <LogoMark className="inline h-5 w-8 -translate-y-px" />
      <span className="ml-1 font-heading font-semibold text-ink">
        {UI_STRINGS.wordmark[language]}
      </span>
    </span>
  );
}
