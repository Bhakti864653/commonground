"use client";

import { UI_STRINGS, type Language } from "@/lib/i18n/dictionary";
import { STATUS_LABELS, type ReportStatusEvent } from "@/lib/schema/report";

export function StatusHistoryTimeline({
  events,
  language,
}: {
  events: ReportStatusEvent[];
  language: Language;
}) {
  const t = UI_STRINGS.caseDetail;

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-teal">
        {t.historyHeading[language]}
      </h2>
      <ol className="mt-3 flex flex-col gap-3">
        {events.map((event) => (
          <li key={event.id} className="flex items-start gap-3 text-sm">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
            <div>
              <p className="font-medium text-ink">
                {STATUS_LABELS[event.status][language]}
                <span className="ml-2 text-xs font-normal text-slate">
                  {t.actorType[event.actorType][language]}
                </span>
              </p>
              <p className="text-xs text-slate">
                {new Date(event.occurredAt).toLocaleDateString(
                  language === "es" ? "es-PA" : "en-US",
                )}
              </p>
              {(language === "es" ? event.noteEs ?? event.note : event.note) && (
                <p className="mt-0.5 text-ink/80">
                  {language === "es" ? event.noteEs ?? event.note : event.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
