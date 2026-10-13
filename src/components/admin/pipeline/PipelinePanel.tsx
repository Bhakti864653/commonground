"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  approveFollowUpAction,
  approveReferralAction,
  approveRoutingAction,
  draftReferralAction,
  mergeDuplicateAction,
  rejectProposalAction,
  rerunRoutingAction,
  setRoutingAction,
  approveOfficeNoteAction,
  confirmOfficeResolutionAction,
  rejectOfficeResolutionAction,
} from "@/lib/pipeline/actions";
import { OFFICE_STATUS_LABELS, type OfficeNote, type OfficeReferral } from "@/lib/office/types";
import { LANGUAGES, type Language } from "@/lib/i18n/languages";
import { PrioritySchema, type CasePipelineState, type Priority, type Proposal } from "@/lib/pipeline/types";
import type { PipelineStage, AuditEntry, OutboxItem } from "@/lib/pipeline/types";
import type { PipelineResult } from "@/lib/pipeline/pipeline";
import { PipelineBar } from "./PipelineBar";
import { AuditTimeline, CritiqueView, FailureNote, OutboxItemView, PriorityBadge, SourceBadge } from "./bits";

export type OfficeOption = { id: string; name: string };

type Props = {
  caseNumber: string;
  stage: PipelineStage;
  state?: CasePipelineState;
  proposals: Proposal[];
  outbox: OutboxItem[];
  audit: AuditEntry[];
  offices: OfficeOption[];
  officeReferrals?: OfficeReferral[];
  officeNotes?: OfficeNote[];
};

const PRIORITIES = PrioritySchema.options;
const btn = "rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50";
const primary = `${btn} bg-teal text-cream`;
const secondary = `${btn} border border-ink/15 text-ink`;
// Office names are long: never wider than the screen on a phone.
const select = "max-w-full rounded-md border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink";

/**
 * The moderator's view of one case in the agentic pipeline: where it is, what the agents
 * propose (with the Critic's review), the dry-run outbox, and the full agent timeline.
 * Every button here is a moderator decision; agents never change anything by themselves.
 */
export function PipelinePanel({ caseNumber, stage, state, proposals, outbox, audit, offices, officeReferrals = [], officeNotes = [] }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const officeName = (id?: string) => offices.find((o) => o.id === id)?.name ?? id ?? "—";

  async function run(key: string, fn: () => Promise<PipelineResult>) {
    setBusy(key);
    setResult(null);
    try {
      setResult(await fn());
    } catch {
      setResult({ ok: false, reason: "Something went wrong. Please try again." });
    }
    setBusy(null);
    router.refresh();
  }

  const pending = proposals.filter((p) => p.status === "pending");
  const routing = pending.find((p): p is Extract<Proposal, { kind: "routing" }> => p.kind === "routing");
  const referral = pending.find((p): p is Extract<Proposal, { kind: "referral" }> => p.kind === "referral");
  const followUp = pending.find((p): p is Extract<Proposal, { kind: "follow_up" }> => p.kind === "follow_up");
  const officeNoteProposals = pending.filter((p): p is Extract<Proposal, { kind: "office_note" }> => p.kind === "office_note");
  const resolution = pending.find((p): p is Extract<Proposal, { kind: "office_resolution" }> => p.kind === "office_resolution");
  const canDraft = !!state?.officeId && !referral && !outbox.some((o) => o.kind === "referral");

  return (
    <section aria-labelledby="pipeline-title" className="flex flex-col gap-4 rounded-lg border border-teal/40 bg-mint/10 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="pipeline-title" className="text-base font-semibold text-ink">
            Agentic pipeline
          </h2>
          <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-semibold text-ink">Sending paused · demo mode</span>
        </div>
        <PipelineBar stage={stage} />
        <p className="text-xs text-slate">
          Agents only propose. Nothing changes, publishes, or enters the outbox until you approve it — and the outbox never sends.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {state?.officeId ? (
            <span className="rounded-full bg-cream px-2 py-0.5 font-medium text-ink">Office: {officeName(state.officeId)}</span>
          ) : (
            <span className="rounded-full bg-cream px-2 py-0.5 text-slate">Not routed yet</span>
          )}
          {state?.priority && <PriorityBadge priority={state.priority} />}
          {state?.emergency && <span className="rounded-full bg-coral px-2 py-0.5 font-semibold text-cream">Emergency phrase: resident told to call 911</span>}
          {state?.title && <span className="rounded-full bg-cream px-2 py-0.5 text-ink">Guide title: “{state.title}”</span>}
        </div>
      </div>

      {result && (
        <p role="status" className={`rounded-md p-2 text-sm ${result.ok ? "bg-mint/50 text-ink" : "bg-coral/10 text-coral"}`}>
          {result.ok ? `✓ ${result.message ?? "Done."}` : `✗ ${result.reason}`}
        </p>
      )}

      {routing && <RoutingCard proposal={routing} caseNumber={caseNumber} offices={offices} busy={busy} run={run} officeName={officeName} />}
      {referral && <ReferralCardNew proposal={referral} busy={busy} run={run} officeName={officeName} />}
      {followUp && <FollowUpCard proposal={followUp} busy={busy} run={run} />}
      {resolution && (
        <CardShell title={`${officeName(resolution.payload.officeId)} says the problem is resolved`} source="office">
          <p className="mt-2 text-sm text-ink">Confirm to close the case (residents see it as Closed), or send it back to the office as “In progress”.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={primary} disabled={busy !== null} onClick={() => run("confirm-resolution", () => confirmOfficeResolutionAction(resolution.id))}>
              Confirm and close the case
            </button>
            <button type="button" className={secondary} disabled={busy !== null} onClick={() => run("reject-resolution", () => rejectOfficeResolutionAction(resolution.id))}>
              Not yet
            </button>
          </div>
        </CardShell>
      )}
      {officeNoteProposals.map((p) => (
        <CardShell key={p.id} title={`${officeName(p.payload.officeId)} wrote a public note`} source={p.payload.source}>
          <p className="mt-2 rounded bg-surface p-2 text-sm text-ink">“{p.payload.original}”</p>
          <details className="mt-2 text-xs" open>
            <summary className="cursor-pointer text-slate">Translations to check (all 7 languages)</summary>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
              {Object.entries(p.payload.translations).map(([lang, text]) => (
                <div key={lang} className="contents">
                  <dt className="font-semibold text-slate">{lang}</dt>
                  <dd className="text-ink/85">{text}</dd>
                </div>
              ))}
            </dl>
          </details>
          <CritiqueView critique={p.critique} />
          <FailureNote note={p.failureNote} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={primary} disabled={busy !== null} onClick={() => run(`note-${p.id}`, () => approveOfficeNoteAction(p.id))}>
              Publish on the case page
            </button>
            <button type="button" className={secondary} disabled={busy !== null} onClick={() => run(`note-x-${p.id}`, () => rejectProposalAction(p.id))}>
              Dismiss
            </button>
          </div>
        </CardShell>
      ))}

      {officeReferrals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink">Office side</h3>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {officeReferrals.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{officeName(r.officeId)}</span>
                <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink">{OFFICE_STATUS_LABELS[r.status]}</span>
                {r.isDemo && <span className="text-xs text-slate">(simulated demo office)</span>}
                <span className="text-xs text-slate">since {new Date(r.statusChangedAt).toLocaleString()}</span>
                {r.declineReason && <span className="text-xs text-coral">Reason: {r.declineReason}</span>}
              </li>
            ))}
          </ul>
          {officeNotes.filter((n) => n.kind === "private").length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 rounded-md bg-ink/5 p-2 text-xs text-ink/85">
              {officeNotes
                .filter((n) => n.kind === "private")
                .map((n) => (
                  <li key={n.id}>
                    <span className="font-semibold">Private note from {officeName(n.officeId)}</span> · {new Date(n.createdAt).toLocaleString()}: {n.text}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondary} disabled={busy !== null} onClick={() => run("rerun", () => rerunRoutingAction(caseNumber))}>
          {busy === "rerun" ? "Routing Agent is working…" : "Re-run Routing Agent"}
        </button>
        {canDraft && (
          <button type="button" className={secondary} disabled={busy !== null} onClick={() => run("draft", () => draftReferralAction(caseNumber, "en"))}>
            {busy === "draft" ? "Referral Agent is drafting…" : "Draft referral"}
          </button>
        )}
      </div>

      <ManualRouting caseNumber={caseNumber} state={state} offices={offices} busy={busy} run={run} />

      <div>
        <h3 className="text-sm font-semibold text-ink">Outbox for this case ({outbox.length})</h3>
        {outbox.length === 0 ? (
          <p className="mt-1 text-sm text-slate">Nothing prepared yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {outbox.map((o) => (
              <OutboxItemView key={o.id} item={o} />
            ))}
          </div>
        )}
      </div>

      <details>
        <summary className="cursor-pointer text-sm font-semibold text-ink">Agent timeline / audit log ({audit.length})</summary>
        <p className="mt-1 text-xs text-slate">Every step: which agent did what, when and why, and what a moderator approved or changed. Private to moderators.</p>
        <div className="mt-3">
          <AuditTimeline entries={audit} />
        </div>
      </details>

      {proposals.some((p) => p.status !== "pending") && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-ink">Past suggestions ({proposals.filter((p) => p.status !== "pending").length})</summary>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-ink/80">
            {proposals
              .filter((p) => p.status !== "pending")
              .map((p) => (
                <li key={p.id}>
                  {p.kind.replace("_", " ")} — <span className="font-medium">{p.status}</span>
                  {p.reviewedBy && ` by ${p.reviewedBy}`} · {new Date(p.reviewedAt ?? p.createdAt).toLocaleString()}
                  {p.kind === "routing" && ` · ${officeName(p.payload.officeId)}, ${p.payload.priority}`}
                </li>
              ))}
          </ul>
        </details>
      )}
      <p className="text-xs text-slate">
        <Link href="/admin/pipeline" className="font-medium text-teal underline">
          Open the pipeline dashboard
        </Link>
      </p>
    </section>
  );
}

type CardProps<K extends Proposal["kind"]> = {
  proposal: Extract<Proposal, { kind: K }>;
  busy: string | null;
  run: (key: string, fn: () => Promise<PipelineResult>) => Promise<void>;
};

function CardShell({ title, source, children }: { title: string; source: Proposal["payload"]["source"]; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-teal/40 bg-cream p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <SourceBadge source={source} />
        <span className="rounded-full bg-coral/10 px-2 py-0.5 text-xs font-medium text-coral">Waiting for you</span>
      </div>
      {children}
    </div>
  );
}

function RoutingCard({
  proposal,
  caseNumber,
  offices,
  busy,
  run,
  officeName,
}: CardProps<"routing"> & { caseNumber: string; offices: OfficeOption[]; officeName: (id?: string) => string }) {
  const p = proposal.payload;
  const [officeId, setOfficeId] = useState(p.officeId);
  const [priority, setPriority] = useState<Priority>(p.priority);
  const [language, setLanguage] = useState<Language>("en");
  const changed = officeId !== p.officeId || priority !== p.priority;
  return (
    <CardShell title="Routing Agent suggests" source={p.source}>
      <p className="mt-2 text-sm text-ink">
        <span className="font-semibold">{officeName(p.officeId)}</span> — {p.reason}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink">
        <PriorityBadge priority={p.priority} /> <span className="text-ink/80">{p.priorityReason}</span>
      </p>
      <p className="mt-1 text-xs text-slate">
        Confidence: <span className="font-semibold text-ink">{Math.round(p.confidence * 100)}%</span>
        {p.alternativeOfficeIds.length > 0 && <> · Could also fit: {p.alternativeOfficeIds.map(officeName).join(", ")}</>}
      </p>
      {p.needsModeratorDecision && (
        <p className="mt-2 rounded-md bg-coral/10 p-2 text-xs font-medium text-coral">
          The agent isn’t sure{p.injectionSuspected ? " (the report contains text that looks like instructions to the AI — it was ignored)" : ""}. Please choose the office yourself.
        </p>
      )}
      {p.possibleDuplicates.length > 0 && (
        <div className="mt-2 rounded-md border border-ink/10 p-2 text-xs">
          <p className="font-semibold text-ink">Possible duplicates nearby:</p>
          <ul className="mt-1 flex flex-col gap-1">
            {p.possibleDuplicates.map((d) => (
              <li key={d.caseNumber} className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/cases/${d.caseNumber}`} className="font-medium text-teal underline">
                  {d.caseNumber}
                </Link>
                <span className="text-slate">similarity {Math.round(d.score * 100)}%</span>
                <button
                  type="button"
                  className={`${btn} border border-ink/15 px-2 py-0.5 text-xs text-ink`}
                  disabled={busy !== null}
                  onClick={() => run(`merge-${d.caseNumber}`, () => mergeDuplicateAction(caseNumber, d.caseNumber))}
                >
                  Merge into {d.caseNumber}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <CritiqueView critique={proposal.critique} />
      <FailureNote note={proposal.failureNote} />
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex max-w-full flex-col text-xs text-slate">
          Office
          <select aria-label="Office" className={select} value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex max-w-full flex-col text-xs text-slate">
          Priority
          <select aria-label="Priority" className={select} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="flex max-w-full flex-col text-xs text-slate">
          Referral translation for me
          <select aria-label="Translation language" className={select} value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.code === "es" ? "None (Spanish only)" : l.nativeName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={primary}
          disabled={busy !== null}
          onClick={() => run("approve-routing", () => approveRoutingAction(proposal.id, { officeId, priority, moderatorLanguage: language }))}
        >
          {busy === "approve-routing" ? "Approving… (Referral Agent drafting)" : changed ? "Approve with my changes" : "Approve routing"}
        </button>
        <button type="button" className={secondary} disabled={busy !== null} onClick={() => run("reject-routing", () => rejectProposalAction(proposal.id))}>
          Dismiss
        </button>
      </div>
    </CardShell>
  );
}

function ReferralCardNew({ proposal, busy, run, officeName }: CardProps<"referral"> & { officeName: (id?: string) => string }) {
  const p = proposal.payload;
  const [message, setMessage] = useState(p.messageEs);
  return (
    <CardShell title={`Referral Agent drafted a message to ${officeName(p.officeId)}`} source={p.source}>
      <p className="mt-1 text-xs text-slate">
        Facts added by code: open {p.facts.daysOpen} days · {p.facts.residentCount} resident(s) reported it · public link. Edit freely — the
        same checks run again when you approve.
      </p>
      <label className="mt-2 block text-xs text-slate">
        Message (Spanish)
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={12}
          className="mt-1 w-full rounded-md border border-ink/15 bg-surface p-2 text-sm text-ink"
        />
      </label>
      {p.translation && message === p.messageEs && (
        <details className="mt-1 text-xs">
          <summary className="cursor-pointer text-slate">Translation ({p.translation.language})</summary>
          <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-ink/80">{p.translation.text}</pre>
        </details>
      )}
      <CritiqueView critique={proposal.critique} />
      <FailureNote note={proposal.failureNote} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={primary}
          disabled={busy !== null}
          onClick={() => run("approve-referral", () => approveReferralAction(proposal.id, message === p.messageEs ? undefined : message))}
        >
          Approve → outbox (not sent)
        </button>
        <button type="button" className={secondary} disabled={busy !== null} onClick={() => run("reject-referral", () => rejectProposalAction(proposal.id))}>
          Dismiss
        </button>
      </div>
    </CardShell>
  );
}

function FollowUpCard({ proposal, busy, run }: CardProps<"follow_up">) {
  const p = proposal.payload;
  const [reminder, setReminder] = useState(true);
  const [publicUpdate, setPublicUpdate] = useState(true);
  const [escalate, setEscalate] = useState(!!p.escalateTo);
  return (
    <CardShell title="Follow-up Agent flagged this case" source={p.source}>
      <p className="mt-2 text-sm text-ink">
        No progress for <span className="font-semibold">{p.daysWithoutProgress} days</span> (limit {p.thresholdDays} days for {p.priority} cases).
      </p>
      <fieldset className="mt-2 flex flex-col gap-2 text-sm">
        <legend className="sr-only">Choose what to approve</legend>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} className="mt-1" />
          <span>
            Reminder to the office → outbox (not sent)
            <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-surface p-2 font-sans text-xs text-ink/80">{p.reminderEs}</pre>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={publicUpdate} onChange={(e) => setPublicUpdate(e.target.checked)} className="mt-1" />
          <span>
            Publish this status update on the public case page (7 languages)
            <span className="mt-1 block rounded bg-surface p-2 text-xs text-ink/80">
              <span className="font-medium">es:</span> {p.publicUpdate.es}
              <br />
              <span className="font-medium">en:</span> {p.publicUpdate.en}
            </span>
          </span>
        </label>
        {p.escalateTo && (
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={escalate} onChange={(e) => setEscalate(e.target.checked)} className="mt-1" />
            <span>
              Escalate priority {p.priority} → <span className="font-semibold">{p.escalateTo}</span>
              {p.escalateReason && <span className="block text-xs text-slate">{p.escalateReason}</span>}
            </span>
          </label>
        )}
      </fieldset>
      <CritiqueView critique={proposal.critique} />
      <FailureNote note={proposal.failureNote} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={primary}
          disabled={busy !== null}
          onClick={() => run("approve-follow-up", () => approveFollowUpAction(proposal.id, { reminder, publicUpdate, escalate: escalate && !!p.escalateTo }))}
        >
          Approve selected
        </button>
        <button type="button" className={secondary} disabled={busy !== null} onClick={() => run("reject-follow-up", () => rejectProposalAction(proposal.id))}>
          Dismiss
        </button>
      </div>
    </CardShell>
  );
}

function ManualRouting({
  caseNumber,
  state,
  offices,
  busy,
  run,
}: {
  caseNumber: string;
  state?: CasePipelineState;
  offices: OfficeOption[];
  busy: string | null;
  run: (key: string, fn: () => Promise<PipelineResult>) => Promise<void>;
}) {
  const [officeId, setOfficeId] = useState(state?.officeId ?? offices[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>(state?.priority ?? "medium");
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold text-ink">Set office &amp; priority by hand</summary>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <select aria-label="Office (manual)" className={select} value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select aria-label="Priority (manual)" className={select} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          {PRIORITIES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <button type="button" className={secondary} disabled={busy !== null} onClick={() => run("manual", () => setRoutingAction(caseNumber, officeId, priority))}>
          Save
        </button>
      </div>
    </details>
  );
}
