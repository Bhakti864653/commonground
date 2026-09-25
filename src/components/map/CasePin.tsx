"use client";

import type { Language } from "@/lib/i18n/dictionary";
import { formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import { STATUS_LABELS, type PublicCase } from "@/lib/schema/report";
import { STATUS_TONE } from "@/components/journey/Pills";

/**
 * A numbered case marker. The number matches the case's row in the list below the map, and the
 * accessible label spells out case number, area, and status, so color is never the only signal.
 */
export function CasePin({
  c,
  index,
  selected,
  onSelect,
  language,
  size = "lg",
  className = "",
  style,
}: {
  c: PublicCase;
  index: number;
  selected: boolean;
  onSelect: (c: PublicCase) => void;
  language: Language;
  size?: "lg" | "sm";
  className?: string;
  style?: React.CSSProperties;
}) {
  const tone = STATUS_TONE[c.status];
  const number = String(index + 1).padStart(2, "0");
  return (
    <button
      type="button"
      onClick={() => onSelect(c)}
      aria-pressed={selected}
      aria-label={`${number}: ${c.publicCaseNumber}, ${formatApproximateAreaLabel(c.approximateArea, language)}, ${STATUS_LABELS[c.status][language]}`}
      style={style}
      className={`flex items-center justify-center rounded-full font-heading text-white transition-transform hover:scale-[1.14] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink ${
        size === "lg"
          ? "h-[39px] w-[39px] border-[3px] border-white text-[0.9rem] shadow-[0_7px_18px_#12352638] md:h-[45px] md:w-[45px] md:text-base"
          : "h-[34px] w-[34px] border-2 border-white text-[0.82rem] shadow-[0_5px_14px_#12352640]"
      } ${tone === "review" ? "bg-pin-review" : tone === "progress" ? "bg-pin-progress" : "bg-[#172b25]"} ${
        selected ? "scale-[1.14] ring-4 ring-lime" : ""
      } ${className}`}
    >
      {number}
    </button>
  );
}
