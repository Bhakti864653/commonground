"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { demoOfficeAddNoteAction, demoOfficeChangeStatusAction, officeAddNoteAction, officeChangeStatusAction } from "@/lib/office/actions";
import { NEXT_STATUSES, OFFICE_STATUS_LABELS, type OfficeReferralView, type OfficeStatus } from "@/lib/office/types";
import type { PipelineResult } from "@/lib/pipeline/pipeline";

/**
 * The office inbox — the same screen for a real office (mode "real", switched off until go-live)
 * and for a moderator acting as a simulated example office (mode "demo"). Each mode calls its
 * own server actions, which enforce who may see and change what.
 */

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "bg-coral text-cream",
  high: "bg-coral/15 text-coral",
  medium: "bg-mint/60 text-ink",
  low: "bg-ink/5 text-slate",
};
const STATUS_STYLE: Record<OfficeStatus, string> = {
  new: "bg-teal text-cream",
  received: "bg-mint/60 text-ink",
  in_progress: "bg-yellow/40 text-ink",
  resolved: "bg-ink/10 text-ink",
  not_our_department: "bg-coral/15 text-coral",
};
const ACTION_LABELS: Record<OfficeStatus, string> = {
  new: "",
  received: "Mark received",
  in_progress: "Mark in progress",
  resolved: "Mark resolved",
  not_our_department: "Not our department…",
};

export function OfficeInbox({ mode, officeId, referrals }: { mode: "real" | "demo"; officeId: string; referrals: OfficeReferralView[] }) {
  if (referrals.length === 0) {
    return <p className="rounded-lg border border-ink/10 p-4 text-sm text-slate">No referrals in this inbox.</p>;
  }
  return (
    <ul data-demo="office-inbox" className="flex flex-col gap-3">
      {referrals.map((r) => (
        <li key={r.id}>
          <ReferralCard mode={mode} officeId={officeId} referral={r} />
        </li>
      ))}
    </ul>
  );
}

function ReferralCard({ mode, officeId, referral: r }: { mode: "real" | "demo"; officeId: string; referral: OfficeReferralView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [noteKind, setNoteKind] = useState<"public" | "private">("public");
  const [note, setNote] = useState("");

  async function act(fn: () => Promise<PipelineResult>) {
    setBusy(true);
    setResult(null);
    try {
      setResult(await fn());
    } catch {
      setResult({ ok: false, reason: "That didn't work. Please try again." });
    }
    setBusy(false);
    router.refresh();
  }
  const changeStatus = (status: OfficeStatus, why?: string) =>
    act(() => (mode === "demo" ? demoOfficeChangeStatusAction(officeId, r.id, status, why) : officeChangeStatusAction(r.id, status, why)));
  const addNote = () =>
    act(async () => {
      const res = mode === "demo" ? await demoOfficeAddNoteAction(officeId, r.id, { kind: noteKind, text: note }) : await officeAddNoteAction(r.id, { kind: noteKind, text: note });
      if (res.ok) setNote("");
      return res;
    });

  const next = NEXT_STATUSES[r.status];
  return (
    <article data-demo="office-card" className="rounded-lg border border-ink/15 bg-surface p-4 text-sm">
      <header className="flex flex-wrap items-center gap-2">
        <a href={r.publicUrl} target="_blank" rel="noopener noreferrer" className="text-base font-semibold text-teal underline">
          {r.caseNumber}
        </a>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>Status: {OFFICE_STATUS_LABELS[r.status]}</span>
        {r.priority && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[r.priority]}`}>Priority: {r.priority}</span>}
      </header>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-slate">Category</dt>
          <dd className="text-ink">{r.categoryEs}</dd>
        </div>
        <div>
          <dt className="text-slate">Zone</dt>
          <dd className="text-ink">{r.zone}</dd>
        </div>
        <div>
          <dt className="text-slate">Open for</dt>
          <dd className="text-ink">{r.daysOpen} days</dd>
        </div>
        <div>
          <dt className="text-slate">Residents who reported it</dt>
          <dd className="text-ink">{r.residentCount}</dd>
        </div>
      </dl>
      <p className="mt-2 whitespace-pre-wrap text-ink/85">{r.description}</p>
      {r.declineReason && <p className="mt-2 text-xs text-coral">Your reason: {r.declineReason}</p>}

      {next.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {next
            .filter((s) => s !== "not_our_department")
            .map((s) => (
              <button key={s} type="button" disabled={busy} onClick={() => changeStatus(s)} className="rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50">
                {ACTION_LABELS[s]}
              </button>
            ))}
          {next.includes("not_our_department") && !declining && (
            <button type="button" disabled={busy} onClick={() => setDeclining(true)} className="rounded-md border border-coral/50 px-3 py-1.5 text-sm font-medium text-coral">
              {ACTION_LABELS.not_our_department}
            </button>
          )}
        </div>
      )}
      {declining && (
        <div className="mt-2 flex flex-col gap-2 rounded-md border border-coral/30 p-2">
          <label className="text-xs text-slate">
            Why isn’t this your department? (Moderators use it to re-route the case.)
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} className="mt-1 w-full rounded-md border border-ink/15 bg-cream p-2 text-sm text-ink" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || reason.trim().length < 5}
              onClick={async () => {
                await changeStatus("not_our_department", reason);
                setDeclining(false);
              }}
              className="rounded-md bg-coral px-3 py-1.5 text-sm font-medium text-cream disabled:opacity-50"
            >
              Send back to CommonGround
            </button>
            <button type="button" onClick={() => setDeclining(false)} className="rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 border-t border-ink/10 pt-3">
        <fieldset className="flex flex-wrap gap-3 text-xs">
          <legend className="sr-only">Note type</legend>
          <label className="flex items-center gap-1">
            <input type="radio" name={`kind-${r.id}`} checked={noteKind === "public"} onChange={() => setNoteKind("public")} /> Public note (shown on the case page after a moderator approves it)
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name={`kind-${r.id}`} checked={noteKind === "private"} onChange={() => setNoteKind("private")} /> Private note (moderators only)
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <textarea
            aria-label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Escriba una nota…"
            className="min-w-0 flex-1 rounded-md border border-ink/15 bg-cream p-2 text-sm text-ink"
          />
          <button type="button" disabled={busy || !note.trim()} onClick={addNote} className="self-end rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50">
            {busy ? "Sending…" : "Add note"}
          </button>
        </div>
        {r.notes.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs text-ink/80">
            {r.notes.map((n, i) => (
              <li key={i}>
                <span className="font-semibold">{n.kind === "public" ? "Public (sent for approval)" : "Private"}</span> · {new Date(n.createdAt).toLocaleString()}: {n.text}
              </li>
            ))}
          </ul>
        )}
      </div>
      {result && (
        <p role="status" className={`mt-2 text-sm ${result.ok ? "text-teal" : "text-coral"}`}>
          {result.ok ? `✓ ${result.message ?? "Done."}` : `✗ ${result.reason}`}
        </p>
      )}
    </article>
  );
}
