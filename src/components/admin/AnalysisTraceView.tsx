"use client";

import type { AgentTraceStep, SuggestionDecision } from "@/lib/guide/case-analysis";

const AGENT_LABELS: Record<AgentTraceStep["agent"], string> = {
  duplicate: "Duplicate agent",
  status: "Status agent",
  verification: "Verification agent",
  critique: "Critique agent",
};

const FINAL_DECISION_LABELS: Record<SuggestionDecision["finalDecision"], string> = {
  kept: "Kept",
  rejected_deterministic: "Rejected (failed validation)",
  rejected_critique: "Rejected (critique)",
};

const FINAL_DECISION_STYLES: Record<SuggestionDecision["finalDecision"], string> = {
  kept: "text-teal",
  rejected_deterministic: "text-coral",
  rejected_critique: "text-coral",
};

/**
 * Shows the tools consulted, validated evidence, and high-level outcomes for one analysis run —
 * never the models' internal chain-of-thought, prompts, or any private case field. Collapsed by
 * default so it doesn't dominate the panel.
 */
export function AnalysisTraceView({
  trace,
  decisions,
}: {
  trace: AgentTraceStep[];
  decisions: SuggestionDecision[];
}) {
  if (trace.length === 0) return null;

  return (
    <details className="mt-3 rounded-md border border-ink/10 bg-cream p-2 text-xs">
      <summary className="cursor-pointer font-medium text-ink">
        Agent activity ({trace.length} step{trace.length === 1 ? "" : "s"})
      </summary>

      <ul className="mt-2 flex flex-col gap-2">
        {trace.map((step, i) => (
          <li key={i} className="rounded border border-ink/10 p-2">
            <p className="font-medium text-ink">{AGENT_LABELS[step.agent]}</p>
            <p className="mt-0.5 text-ink/70">{step.outcome}</p>
            {step.toolCalls.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1 text-[11px] text-slate">
                {step.toolCalls.map((call, j) => (
                  <li key={j}>
                    consulted <span className="font-mono">{call.name}</span>
                    {call.args !== "{}" && <span className="font-mono"> {call.args}</span>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {decisions.length > 0 && (
        <>
          <p className="mt-3 font-medium text-ink">Candidate suggestions and outcomes</p>
          <ul className="mt-1 flex flex-col gap-2">
            {decisions.map((d, i) => (
              <li key={i} className="rounded border border-ink/10 p-2">
                <p>
                  <span className="font-medium text-ink">{d.kind}</span>: {d.suggestedValue} —{" "}
                  <span className={`font-medium ${FINAL_DECISION_STYLES[d.finalDecision]}`}>
                    {FINAL_DECISION_LABELS[d.finalDecision]}
                  </span>
                </p>
                <p className="mt-0.5 text-ink/70">{d.reason}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </details>
  );
}
