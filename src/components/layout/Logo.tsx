import { UI_STRINGS } from "@/lib/i18n/dictionary";
import type { Language } from "@/lib/i18n/dictionary";

/**
 * "The Plaza": three streets arriving from different directions and meeting at one shared,
 * sunlit square — common ground, drawn as a place rather than a symbol. The tile is a soft
 * parcel of land (the same organic shape as the landscape's ground), so the mark reads as a
 * piece of the town the rest of the product illustrates. Works at 16px: three strokes, one
 * dot, no text.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <clipPath id="cg-logo-parcel">
          <path d="M24 2.5c13.6 0 21.5 7.4 21.5 21.2 0 13.9-7.9 21.8-21.5 21.8S2.5 37.6 2.5 23.7C2.5 9.9 10.4 2.5 24 2.5Z" />
        </clipPath>
      </defs>
      <path
        d="M24 2.5c13.6 0 21.5 7.4 21.5 21.2 0 13.9-7.9 21.8-21.5 21.8S2.5 37.6 2.5 23.7C2.5 9.9 10.4 2.5 24 2.5Z"
        fill="var(--logo-tile, #0e5e57)"
      />
      <g clipPath="url(#cg-logo-parcel)" fill="none" stroke="var(--logo-street, #fbf6ea)" strokeWidth="4.2" strokeLinecap="round">
        <path d="M-2 38c9-1.5 14.5-5.5 20.5-11.5" />
        <path d="M21 -2c-1 9 2.5 14.5 2.5 20" />
        <path d="M50 29c-8.5 0-14.5-1.5-20-4" />
      </g>
      <circle cx="24.4" cy="24.4" r="6.4" fill="var(--logo-plaza, #f2b92a)" />
    </svg>
  );
}

export function Wordmark({ language, className }: { language: Language; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="font-heading text-[1.3rem] leading-none text-ink">
        {UI_STRINGS.wordmark[language]}
      </span>
    </span>
  );
}
