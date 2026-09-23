"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { renderCategoryIcon } from "@/components/icons/category-icon-map";
import { EXPERIENCE } from "@/lib/i18n/experience";
import type { Language } from "@/lib/i18n/dictionary";
import { formatApproximateAreaLabel } from "@/lib/privacy/approximate-area";
import type { PublicCase } from "@/lib/schema/report";
import type { CategoryConfig } from "@/lib/schema/community";
import { StatusPill } from "./Pills";
import { StageMeter } from "./StageMeter";

/**
 * One case as a row in a ledger rather than a floating card: category, what was observed,
 * where (approximately), status, how far along the journey it is, and its public case number.
 * Never a like/follower/ranking count of any kind (DESIGN_SYSTEM.md).
 */
export function CaseRow({
  caseItem,
  category,
  language,
  selected = false,
  onFocusCase,
}: {
  caseItem: PublicCase;
  category: CategoryConfig | undefined;
  language: Language;
  selected?: boolean;
  onFocusCase?: (c: PublicCase) => void;
}) {
  const typeLabel = EXPERIENCE.landscape.markerLegend[caseItem.type][language];
  const date = new Date(caseItem.createdAt).toLocaleDateString(language === "es" ? "es-PA" : "en-US", {
    day: "numeric",
    month: "short",
  });

  return (
    <li>
      <Link
        href={`/cases/${caseItem.publicCaseNumber}`}
        onMouseEnter={() => onFocusCase?.(caseItem)}
        onFocus={() => onFocusCase?.(caseItem)}
        className={`group grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl px-3 py-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal sm:px-4 ${
          selected ? "bg-mint/70" : "hover:bg-mint/40"
        }`}
      >
        <span
          className={`mt-0.5 flex h-10 w-10 items-center justify-center text-teal ${
            caseItem.type === "proposal" ? "rotate-45 rounded-lg bg-turquoise/15" : "rounded-full bg-mint"
          }`}
          aria-hidden="true"
        >
          <span className={caseItem.type === "proposal" ? "-rotate-45" : ""}>
            {category && renderCategoryIcon(category.icon, { className: "h-4.5 w-4.5" })}
          </span>
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium text-ink">{(language === "es" ? category?.labelEs : category?.label) ?? ""}</span>
            <span className="text-slate">{typeLabel}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-[0.95rem] leading-snug text-ink/85">{caseItem.description}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate">
            <StatusPill status={caseItem.status} language={language} />
            <StageMeter status={caseItem.status} language={language} compact />
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
              {formatApproximateAreaLabel(caseItem.approximateArea, language)}
            </span>
            <span>{date}</span>
            <span className="tabular-nums text-ink/70">{caseItem.publicCaseNumber}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}
