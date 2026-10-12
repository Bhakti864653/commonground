import { Check } from "lucide-react";
import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStage } from "@/lib/pipeline/types";

/**
 * Drafted → Routed → Reviewed by agents → Referral prepared (sending paused) → Follow-up, with the
 * current step highlighted. Each step says in words whether it's done, current, or still to come
 * (never color alone). Wraps onto several lines on a phone.
 */
export function PipelineBar({ stage }: { stage: PipelineStage }) {
  const current = PIPELINE_STAGES.indexOf(stage);
  return (
    <ol aria-label="Pipeline progress" className="flex flex-wrap items-center gap-1.5 text-xs">
      {PIPELINE_STAGES.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "next";
        return (
          <li key={s} className="flex items-center gap-1.5">
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${
                state === "current"
                  ? "border-teal bg-teal text-cream"
                  : state === "done"
                    ? "border-teal/40 bg-mint/40 text-ink"
                    : "border-ink/15 text-slate"
              }`}
            >
              {state === "done" && <Check aria-hidden="true" className="h-3 w-3" />}
              <span className="sr-only">{state === "done" ? "Done: " : state === "current" ? "Current step: " : "Not yet: "}</span>
              {i + 1}. {STAGE_LABELS[s]}
            </span>
            {i < PIPELINE_STAGES.length - 1 && <span aria-hidden="true" className="text-slate">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
