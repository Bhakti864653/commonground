import { EXPERIENCE, fill } from "@/lib/i18n/experience";
import type { Language } from "@/lib/i18n/dictionary";
import { ACTION_TRAIL_STAGES, type ReportStatus } from "@/lib/schema/report";
import { currentStage, stagesReached } from "@/lib/landscape/layout";

/**
 * A compact five-segment path for lists and panels: filled segments are stages actually
 * reached (STATUS_TO_TRAIL_PROGRESS), never an optimistic next one. The text names the stage,
 * so the meter is never the only signal.
 */
export function StageMeter({ status, language, compact = false }: { status: ReportStatus; language: Language; compact?: boolean }) {
  const reached = stagesReached(status);
  const stage = currentStage(status);
  const label = `${EXPERIENCE.stage[stage][language]}, ${fill(EXPERIENCE.stage.stageOf[language], {
    n: reached,
    total: ACTION_TRAIL_STAGES.length,
  })}`;

  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 100 10" className={compact ? "h-2 w-16" : "h-2.5 w-24"} aria-hidden="true" preserveAspectRatio="none">
        {ACTION_TRAIL_STAGES.map((s, i) => (
          <rect
            key={s}
            x={i * 20 + 1}
            y="1"
            width="18"
            height="8"
            rx="4"
            fill={i < reached ? "var(--teal)" : "var(--ink)"}
            fillOpacity={i < reached ? 1 : 0.12}
          />
        ))}
      </svg>
      <span className={`${compact ? "text-xs" : "text-sm"} text-slate`}>{label}</span>
    </div>
  );
}
