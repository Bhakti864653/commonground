"use client";

import { Check, UserCheck } from "lucide-react";
import { EXPERIENCE } from "@/lib/i18n/experience";
import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import {
  ACTION_TRAIL_STAGES,
  STATUS_LABELS,
  STATUS_TO_TRAIL_PROGRESS,
  type ActionTrailStage,
  type ReportStatus,
  type ReportStatusEvent,
} from "@/lib/schema/report";

function stageForStatus(status: ReportStatus): ActionTrailStage {
  const reached = STATUS_TO_TRAIL_PROGRESS[status];
  return reached[reached.length - 1];
}

/**
 * The case's real journey, top to bottom: each public stage is either reached or honestly
 * "not yet" (never animated ahead of what happened — PRD), and every recorded status event is
 * attached to the stage it moved the case into. A moderator's decision is marked as the human
 * review point it is.
 */
export function CaseJourneyTrail({
  status,
  events,
  language,
}: {
  status: ReportStatus;
  events: ReportStatusEvent[];
  language: Language;
}) {
  const reached = new Set(STATUS_TO_TRAIL_PROGRESS[status]);
  const current = stageForStatus(status);
  const t = EXPERIENCE.caseJourney;
  const eventsByStage = new Map<ActionTrailStage, ReportStatusEvent[]>();
  for (const event of events) {
    const stage = stageForStatus(event.status);
    eventsByStage.set(stage, [...(eventsByStage.get(stage) ?? []), event]);
  }
  const dateFormat = (iso: string) =>
    new Date(iso).toLocaleDateString(language === "es" ? "es-PA" : "en-US", { day: "numeric", month: "long", year: "numeric" });

  return (
    <ol className="relative flex flex-col">
      {ACTION_TRAIL_STAGES.map((stage, i) => {
        const isReached = reached.has(stage);
        const isCurrent = stage === current;
        const isLast = i === ACTION_TRAIL_STAGES.length - 1;
        const nextReached = !isLast && reached.has(ACTION_TRAIL_STAGES[i + 1]);
        const stageEvents = eventsByStage.get(stage) ?? [];

        return (
          <li key={stage} className="relative grid grid-cols-[2.75rem_1fr] gap-x-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute left-[1.3rem] top-11 bottom-0 w-[3px] rounded-full ${nextReached ? "bg-teal" : "bg-ink/10"}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full font-heading text-lg ${
                isReached
                  ? isCurrent
                    ? "bg-teal text-cream ring-4 ring-mint"
                    : "bg-teal text-cream"
                  : "border-2 border-dashed border-ink/20 bg-cream text-slate"
              }`}
            >
              {isReached && !isCurrent ? <Check className="h-5 w-5" /> : i + 1}
            </span>
            <div className="pt-1.5">
              <h3 className={`text-xl ${isReached ? "text-ink" : "text-slate"}`}>
                {EXPERIENCE.stage[stage][language]}
                <span className="sr-only">
                  {" "}
                  ({isReached ? t.reached[language] : t.notYet[language]})
                </span>
              </h3>
              {!isReached && <p className="text-sm text-slate">{t.notYet[language]}</p>}
              {stageEvents.length > 0 && (
                <ul className="mt-3 flex flex-col gap-3">
                  {stageEvents.map((event) => {
                    const note = language === "es" ? event.noteEs ?? event.note : event.note;
                    const isHuman = event.actorType === "moderator";
                    return (
                      <li
                        key={event.id}
                        className={`rounded-2xl px-4 py-3 text-sm ${isHuman ? "border border-forest/30 bg-meadow/50" : "bg-surface"}`}
                      >
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-ink">{STATUS_LABELS[event.status][language]}</span>
                          <span className="text-slate">{dateFormat(event.occurredAt)}</span>
                          {isHuman ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-forest px-2 py-0.5 text-xs font-medium text-cream">
                              <UserCheck aria-hidden="true" className="h-3.5 w-3.5" />
                              {t.humanReview[language]}
                            </span>
                          ) : (
                            <span className="text-xs text-slate">
                              {event.actorType === "verified_source" ? t.bySource[language] : UI_STRINGS.caseDetail.actorType.system[language]}
                            </span>
                          )}
                        </p>
                        {note && <p className="mt-1 text-ink/80">{note}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
