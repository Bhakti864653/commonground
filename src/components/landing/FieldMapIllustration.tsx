import type { Language } from "@/lib/i18n/languages";
import { LANDING } from "@/lib/i18n/landing";

/**
 * The hero's editorial picture: a torn-out page of community field notes. A map fragment with
 * three approximate-area zones (never points on a street), pencilled annotations, and dashed
 * paths that meet under the shared-roof mark. Colors come from the theme tokens, so it follows
 * light/dark. The only motion is the slow drift along the paths (`cg-flow`), which stops under
 * prefers-reduced-motion. Illustrative only — it does not show real cases.
 */
export function FieldMapIllustration({ language }: { language: Language }) {
  const t = LANDING.illustration;
  const note = "fill-[var(--caps)] text-[11px] font-extrabold uppercase tracking-[0.14em]";

  return (
    <svg viewBox="0 0 520 470" role="img" aria-label={t.label[language]} className="h-auto w-full">
      {/* The page, slightly turned, with notebook rules. */}
      <g transform="rotate(-1.6 260 235)">
        <rect x="18" y="18" width="484" height="434" rx="26" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="44" x2="476" y1={70 + i * 32} y2={70 + i * 32} stroke="var(--line)" strokeWidth="1" opacity="0.7" />
        ))}
        {/* Tape holding the page down. */}
        <rect x="214" y="4" width="92" height="30" rx="4" fill="var(--lime)" opacity="0.75" transform="rotate(3 260 19)" />
      </g>

      {/* Map fragment. */}
      <g>
        <path
          d="M58 118 C 120 84, 220 96, 300 86 S 450 92, 468 150 L 470 392 C 400 420, 300 404, 220 414 S 90 420, 56 390 Z"
          fill="var(--map)"
          opacity="0.85"
        />
        <path d="M300 300 C 330 280, 380 286, 402 314 C 420 340, 390 370, 352 366 C 316 362, 286 330, 300 300 Z" fill="var(--map-park)" opacity="0.9" />
        {/* River. */}
        <path d="M58 312 C 130 292, 170 336, 236 318 S 360 262, 470 268" fill="none" stroke="var(--map-water)" strokeWidth="16" strokeLinecap="round" />
        {/* Streets. */}
        <g fill="none" stroke="var(--map-road)" strokeLinecap="round">
          <path d="M70 196 C 170 186, 300 210, 466 190" strokeWidth="9" />
          <path d="M196 96 C 190 190, 214 300, 204 414" strokeWidth="9" />
          <path d="M340 90 C 350 170, 330 250, 360 410" strokeWidth="6" />
          <path d="M80 250 L 196 246" strokeWidth="5" />
        </g>
      </g>

      {/* Approximate areas: soft zones, drawn identically. */}
      <g fill="var(--lime)" fillOpacity="0.28" stroke="var(--ink)" strokeWidth="1.8" strokeDasharray="5 6">
        <circle cx="128" cy="160" r="46" />
        <circle cx="398" cy="150" r="42" />
        <circle cx="146" cy="358" r="40" />
      </g>

      {/* Paths from each area to the shared roof. */}
      <g fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="2 9" className="cg-flow">
        <path d="M164 186 C 200 214, 222 232, 248 244" />
        <path d="M364 170 C 326 196, 300 222, 282 240" />
        <path d="M180 338 C 212 318, 236 296, 252 280" />
      </g>

      {/* Case markers, one per area (illustrative). */}
      <g stroke="var(--surface)" strokeWidth="3">
        <circle cx="128" cy="160" r="9" fill="var(--pin-review)" />
        <circle cx="398" cy="150" r="9" fill="var(--pin-progress)" />
        <circle cx="146" cy="358" r="9" fill="var(--pin-default)" />
      </g>

      {/* The shared-roof mark where the paths meet. */}
      <g transform="translate(222 212)">
        <circle cx="42" cy="44" r="46" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
        <g transform="translate(10 12) scale(1.6)">
          <path d="M14 20L20.5 15L26 20V34H14Z" fill="var(--lime-deep)" />
          <g fill="none" stroke="var(--teal)" strokeWidth="3" strokeLinejoin="round">
            <path d="M4 34V20L15 10L26 20V34Z" />
            <path d="M14 34V20L25 10L36 20V34Z" />
          </g>
          <path d="M4 34H36" stroke="var(--lime-deep)" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>

      {/* Pencilled field notes with leader lines. */}
      <g fill="none" stroke="var(--caps)" strokeWidth="1.3">
        <path d="M86 118 L 70 92" />
        <path d="M424 120 L 438 96" />
        <path d="M112 392 L 96 424" />
        <path d="M300 300 L 334 262" />
      </g>
      <text x="44" y="84" className={note}>
        {t.noteArea[language]}
      </text>
      <text x="476" y="88" textAnchor="end" className={note}>
        {t.noteProposal[language]}
      </text>
      <text x="60" y="440" className={note}>
        {t.noteDrain[language]}
      </text>
      <text x="340" y="254" className={note}>
        {t.noteShared[language]}
      </text>
      {/* A hand-drawn asterisk, the reference's recurring mark. */}
      <g stroke="#e58a52" strokeWidth="3" strokeLinecap="round" transform="translate(452 396)">
        <path d="M0 -12 V 12" />
        <path d="M-10 -6 L 10 6" />
        <path d="M-10 6 L 10 -6" />
      </g>
    </svg>
  );
}
