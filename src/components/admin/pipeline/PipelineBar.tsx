import { Check } from "lucide-react";
import { DISPLAY_STEPS, DISPLAY_STEP_LABELS, type DisplayStep } from "@/lib/pipeline/display";

/**
 * Drafted → Routed → Referral ready → Office → Follow-up, with the current step highlighted (or
 * every step done once the case is closed). Each step says in words whether it's done, current,
 * or still to come (never color alone). Wraps onto several lines on a phone.
 */
export function PipelineBar({ step, closed = false }: { step: DisplayStep; closed?: boolean }) {
  const current = closed ? DISPLAY_STEPS.length : DISPLAY_STEPS.indexOf(step);
  return (
    <ol aria-label="Case progress" className="flex flex-wrap items-center gap-1.5 text-xs">
      {DISPLAY_STEPS.map((s, i) => {
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
              {i + 1}. {DISPLAY_STEP_LABELS[s]}
            </span>
            {i < DISPLAY_STEPS.length - 1 && <span aria-hidden="true" className="text-slate">→</span>}
          </li>
        );
      })}
      {closed && (
        <li className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 font-semibold text-cream">
          <Check aria-hidden="true" className="h-3 w-3" /> Closed
        </li>
      )}
    </ol>
  );
}
