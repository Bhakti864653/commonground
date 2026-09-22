"use client";

import type { AgentTraceStep } from "@/lib/guide/case-analysis";

const AGENT_LABELS: Record<AgentTraceStep["agent"], string> = {
  duplicate: "Duplicate agent",
  status: "Status agent",
  verification: "Verification agent",
  critique: "Critique agent",
};

/**
 * Renders exactly what `analyzeCaseForSuggestions` returned for one run — collapsed by default
 * so it doesn't dominate the panel, but showing every specialist agent (including ones that
 * found nothing) and every real tool call they made, not just the final suggestions. This is
 * the "look inside the agent" view, not a summary of it.
 */
export function AnalysisTraceView({ trace }: { trace: AgentTraceStep[] }) {
  if (trace.length === 0) return null;

  return (
    <details className="mt-3 rounded-md border border-ink/10 bg-cream p-2 text-xs">
      <summary className="cursor-pointer font-medium text-ink">
        How did the agents decide this? ({trace.length} step{trace.length === 1 ? "" : "s"})
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
                    called <span className="font-mono">{call.name}</span>
                    {call.args !== "{}" && <span className="font-mono"> {call.args}</span>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
