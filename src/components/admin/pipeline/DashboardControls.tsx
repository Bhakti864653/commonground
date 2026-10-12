"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveWeeklySummaryAction, rejectProposalAction, resetDemoAction, runFollowUpNowAction } from "@/lib/pipeline/actions";
import type { FollowUpRunReport, PipelineResult } from "@/lib/pipeline/pipeline";
import type { Proposal } from "@/lib/pipeline/types";
import { CritiqueView, FailureNote, SourceBadge } from "./bits";

/** "Run follow-up now": the daily cron's run, on demand, so the demo doesn't wait a day. */
export function RunFollowUpButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<FollowUpRunReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={running}
        onClick={async () => {
          setRunning(true);
          setError(null);
          try {
            setReport(await runFollowUpNowAction());
          } catch {
            setError("The run didn't finish. Please try again in a minute.");
          }
          setRunning(false);
          router.refresh();
        }}
        className="w-max rounded-md bg-teal px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50"
      >
        {running ? "Follow-up Agent is working… (up to a minute)" : "Run follow-up now"}
      </button>
      {error && <p className="text-sm text-coral">{error}</p>}
      {report && (
        <div role="status" className="rounded-md bg-mint/40 p-2 text-sm text-ink">
          <p>
            ✓ Flagged {report.flagged.length} overdue case{report.flagged.length === 1 ? "" : "s"}
            {report.flagged.length > 0 && ` (${report.flagged.join(", ")})`}; drafted {report.summaries.length} weekly summar
            {report.summaries.length === 1 ? "y" : "ies"}; routed {report.routedCatchUp.length} older case
            {report.routedCatchUp.length === 1 ? "" : "s"} privately{report.routedCatchUp.length > 0 && ` (${report.routedCatchUp.join(", ")})`}.
          </p>
          {report.notes.map((n) => (
            <p key={n} className="text-xs text-slate">
              {n}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** A weekly community summary waiting for a moderator to publish it. */
export function SummaryCard({ proposal, areaName }: { proposal: Extract<Proposal, { kind: "weekly_summary" }>; areaName: Record<string, string> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const p = proposal.payload;
  const act = async (fn: () => Promise<PipelineResult>) => {
    setBusy(true);
    setResult(await fn());
    setBusy(false);
    router.refresh();
  };
  return (
    <div className="rounded-lg border border-teal/40 bg-cream p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-ink">Weekly summary · week of {p.weekStart}</h3>
        <SourceBadge source={p.source} />
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-1 text-ink sm:grid-cols-3">
        <li>New cases: {p.newCases}</li>
        <li>Resolved: {p.resolvedCases}</li>
        <li>Open: {p.openCases}</li>
      </ul>
      {p.oldestOpen.length > 0 && <p className="mt-1 text-xs text-slate">Oldest open: {p.oldestOpen.map((o) => `${o.caseNumber} (${o.daysOpen} days)`).join(", ")}</p>}
      {p.hotspots.length > 0 && <p className="mt-1 text-xs text-slate">Areas with the most open reports: {p.hotspots.map((h) => `${areaName[h.areaId] ?? h.areaId} (${h.count})`).join(", ")}</p>}
      {p.highlight && <p className="mt-2 text-ink/85">“{p.highlight.en}”</p>}
      <CritiqueView critique={proposal.critique} />
      <FailureNote note={proposal.failureNote} />
      {result && <p className={`mt-2 text-xs ${result.ok ? "text-teal" : "text-coral"}`}>{result.ok ? result.message ?? "Done." : result.reason}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => act(() => approveWeeklySummaryAction(proposal.id))} className="rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50">
          Publish on the Activity page
        </button>
        <button type="button" disabled={busy} onClick={() => act(() => rejectProposalAction(proposal.id))} className="rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50">
          Dismiss
        </button>
      </div>
    </div>
  );
}

/**
 * "Reset demo": two clicks (no browser dialog). Resets only the eight example cases; resident
 * cases are never touched.
 */
export function ResetDemoButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setResult(await resetDemoAction());
                } catch {
                  setResult({ ok: false, reason: "The reset didn't finish. Nothing was changed." });
                }
                setBusy(false);
                setConfirming(false);
                router.refresh();
              }}
              className="rounded-md bg-coral px-3 py-1.5 text-sm font-semibold text-cream disabled:opacity-50"
            >
              {busy ? "Resetting…" : "Yes, reset the 8 example cases"}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink">
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => { setResult(null); setConfirming(true); }} className="rounded-md border border-coral/50 px-3 py-1.5 text-sm font-semibold text-coral">
            Reset demo
          </button>
        )}
      </div>
      {result && (
        <p role="status" className={`text-sm ${result.ok ? "text-teal" : "text-coral"}`}>
          {result.ok ? `✓ ${result.message}` : `✗ ${result.reason}`}
        </p>
      )}
    </div>
  );
}
