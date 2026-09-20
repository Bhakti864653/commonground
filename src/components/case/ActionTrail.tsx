"use client";

import { Check } from "lucide-react";
import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import { ACTION_TRAIL_STAGES, STATUS_TO_TRAIL_PROGRESS, type ReportStatus } from "@/lib/schema/report";

/**
 * Renders exactly the stages `STATUS_TO_TRAIL_PROGRESS` says the case has actually reached —
 * never an animated/optimistic stage that hasn't happened (PRD: "never animated to a stage
 * that hasn't actually happened").
 */
export function ActionTrail({ status, language }: { status: ReportStatus; language: Language }) {
  const reached = new Set(STATUS_TO_TRAIL_PROGRESS[status]);

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
        {UI_STRINGS.caseDetail.actionTrailHeading[language]}
      </h2>
      <ol className="mt-3 flex items-start justify-between gap-1">
        {ACTION_TRAIL_STAGES.map((stage, i) => {
          const isReached = reached.has(stage);
          return (
            <li key={stage} className="flex flex-1 flex-col items-center gap-1.5 text-center">
              <div className="flex w-full items-center">
                <div
                  className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : isReached ? "bg-teal" : "bg-ink/10"}`}
                />
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    isReached ? "bg-teal text-cream" : "border border-ink/15 bg-cream text-slate"
                  }`}
                >
                  {isReached && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                </div>
                <div
                  className={`h-0.5 flex-1 ${
                    i === ACTION_TRAIL_STAGES.length - 1
                      ? "opacity-0"
                      : reached.has(ACTION_TRAIL_STAGES[i + 1])
                        ? "bg-teal"
                        : "bg-ink/10"
                  }`}
                />
              </div>
              <span className={`text-[11px] font-medium ${isReached ? "text-ink" : "text-slate"}`}>
                {UI_STRINGS.caseDetail.actionTrail[stage][language]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
