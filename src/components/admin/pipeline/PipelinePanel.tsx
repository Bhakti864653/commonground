"use client";

import { useState, type ReactNode } from "react";
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
import type { PipelineStage, AuditEntry, OutboxItem, Critique, OutputSource } from "@/lib/pipeline/types";
import type { PipelineResult } from "@/lib/pipeline/pipeline";
import { CARD_IDS, displayStepOf, nextActionFor } from "@/lib/pipeline/display";
import { PipelineBar } from "./PipelineBar";
import { publicCaseHref } from "../AdminNav";
import { AuditTimeline, CritiqueView, FailureNote, HumanDecision, MadeBy, OutboxItemView, PriorityBadge, SourceBadge, WaitingForHuman } from "./bits";

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
  /** The case is closed (residents see "Closed"). */
  closed?: boolean;
  /** The case was merged into another one. */
  isDuplicate?: boolean;
};

type Run = (key: string, fn: () => Promise<PipelineResult>) => Promise<void>;

const PRIORITIES = PrioritySchema.options;
const btn = "rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50";
const primary = `${btn} bg-teal text-cream`;
const secondary = `${btn} border border-ink/15 text-ink`;
// Office names are long: never wider than the screen on a phone.
const select = "max-w-full rounded-md border border-ink/15 bg-cream px-2 py-1.5 text-sm text-ink";

/** Runs a pipeline action, shows its result, and refreshes the page's data. */
function usePipelineRun() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const run: Run = async (key, fn) => {
    setBusy(key);
    setResult(null);
    try {
      setResult(await fn());
    } catch {
      setResult({ ok: false, reason: "Something went wrong. Please try again." });
    }
    setBusy(null);
    router.refresh();
  };
  return { busy, result, run };
}

function ResultNote({ result }: { result: PipelineResult | null }) {
  if (!result) return null;
  return (
    <p role="status" className={`rounded-md p-2 text-sm ${result.ok ? "bg-mint/50 text-ink" : "bg-coral/10 text-coral"}`}>
      {result.ok ? `✓ ${result.message ?? "Done."}` : `✗ ${result.reason}`}
    </p>
  );
}

const officeNameIn = (offices: OfficeOption[]) => (id?: string) => offices.find((o) => o.id === id)?.name ?? id ?? "—";

/**
 * The moderator's view of one case: where it is (the step bar), the ONE next thing to do, and
 * each agent suggestion as "Suggests / Why / Approve · Change · Dismiss". Every button is a
 * moderator decision; agents never change anything by themselves, and the outbox never sends.
 * The less common tools (re-run, manual routing, past suggestions) are in PipelineTools.
 */
export function PipelinePanel({ caseNumber, stage, state, proposals, outbox, audit, offices, officeReferrals = [], officeNotes = [], closed = false, isDuplicate = false }: Props) {
  const { busy, result, run } = usePipelineRun();
  const officeName = officeNameIn(offices);

  const pending = proposals.filter((p) => p.status === "pending");
  const routing = pending.find((p): p is Extract<Proposal, { kind: "routing" }> => p.kind === "routing");
  const referral = pending.find((p): p is Extract<Proposal, { kind: "referral" }> => p.kind === "referral");
  const followUp = pending.find((p): p is Extract<Proposal, { kind: "follow_up" }> => p.kind === "follow_up");
  const officeNoteProposals = pending.filter((p): p is Extract<Proposal, { kind: "office_note" }> => p.kind === "office_note");
  const resolution = pending.find((p): p is Extract<Proposal, { kind: "office_resolution" }> => p.kind === "office_resolution");
  const canDraft = !!state?.officeId && !referral && !outbox.some((o) => o.kind === "referral");

  const step = displayStepOf(stage, officeReferrals.length > 0);
  const next = nextActionFor({
    pendingKinds: pending.map((p) => p.kind),
    hasOffice: !!state?.officeId,
    canDraft,
    officeStatuses: officeReferrals.map((r) => r.status),
    closed,
    isDuplicate,
  });

  return (
    <section aria-labelledby="pipeline-title" className="flex flex-col gap-4 rounded-lg border border-teal/40 bg-mint/10 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="pipeline-title" className="text-base font-semibold text-ink">
            Where this case is
          </h2>
          <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-semibold text-ink">Sending: OFF (demo mode)</span>
        </div>
        <PipelineBar step={step} closed={closed} />
        <div className="flex flex-wrap gap-2 text-xs">
          {state?.officeId ? (
            <span className="rounded-full bg-cream px-2 py-0.5 font-medium text-ink">Office: {officeName(state.officeId)}</span>
          ) : (
            <span className="rounded-full bg-cream px-2 py-0.5 text-slate">No office yet</span>
          )}
          {state?.priority && <PriorityBadge priority={state.priority} />}
          {state?.emergency && <span className="rounded-full bg-coral px-2 py-0.5 font-semibold text-cream">Emergency phrase: resident told to call 911</span>}
          {state?.title && <span className="rounded-full bg-cream px-2 py-0.5 text-ink">Title: “{state.title}”</span>}
        </div>
      </div>

      <div data-demo="next-action" className="flex flex-col gap-1 rounded-lg border-2 border-teal bg-cream p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate">Next action</p>
        {next.kind === "jump" ? (
          <a
            href={`#${next.target}`}
            onClick={(e) => {
              const el = document.getElementById(next.target);
              if (!el) return;
              e.preventDefault();
              el.scrollIntoView({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
              el.focus({ preventScroll: true });
            }}
            className="w-max max-w-full rounded-md bg-teal px-4 py-2 text-sm font-semibold text-cream"
          >
            {next.label} ↓
          </a>
        ) : next.kind === "route" ? (
          <button type="button" className={`${primary} w-max max-w-full px-4 py-2 font-semibold`} disabled={busy !== null} onClick={() => run("rerun", () => rerunRoutingAction(caseNumber))}>
            {busy === "rerun" ? "Routing Agent is working…" : next.label}
          </button>
        ) : next.kind === "draft" ? (
          <button type="button" className={`${primary} w-max max-w-full px-4 py-2 font-semibold`} disabled={busy !== null} onClick={() => run("draft", () => draftReferralAction(caseNumber, "en"))}>
            {busy === "draft" ? "Referral Agent is drafting…" : next.label}
          </button>
        ) : (
          <p className="text-sm font-semibold text-ink">✓ {next.label}</p>
        )}
      </div>

      <ResultNote result={result} />

      {closed && (
        <a
          href={publicCaseHref(caseNumber)}
          data-demo="resident-view"
          className="w-max max-w-full rounded-lg bg-ink px-5 py-3 text-base font-bold text-cream hover:bg-ink/85"
        >
          See what the resident sees →
        </a>
      )}

      <div data-demo="office-decisions" className={resolution || officeNoteProposals.length ? "flex flex-col gap-4" : "hidden"}>
        {resolution && (
          <SuggestionCard
            id={CARD_IDS.office_resolution}
            madeBy={{ text: "From the office", by: "office" }}
            title={`${officeName(resolution.payload.officeId)} says the problem is resolved`}
            source="office"
            suggests="Close the case. Residents will see it as Closed."
            why="An office can say it’s fixed, but only a person closes a case."
            approveLabel="Approve and close the case"
            onApprove={() => run("confirm-resolution", () => confirmOfficeResolutionAction(resolution.id))}
            dismissLabel="Not yet"
            dismissHint="“Not yet” sends it back to the office as In progress."
            onDismiss={() => run("reject-resolution", () => rejectOfficeResolutionAction(resolution.id))}
            busy={busy}
          />
        )}
        {officeNoteProposals.map((p, i) => (
          <SuggestionCard
            key={p.id}
            id={i === 0 ? CARD_IDS.office_note : undefined}
            madeBy={{ text: "From the office · translated by AI", by: "office" }}
            title={`${officeName(p.payload.officeId)} wrote a public note`}
            source={p.payload.source}
            suggests={
              <>
                Publish this note on the public case page:
                <span className="mt-1 block rounded bg-surface p-2">“{p.payload.original}”</span>
              </>
            }
            why="The office wrote it. The AI translated it into all 7 languages for you to check below."
            critique={p.critique}
            failureNote={p.failureNote}
            onApprove={() => run(`note-${p.id}`, () => approveOfficeNoteAction(p.id))}
            approveLabel="Approve and publish"
            onDismiss={() => run(`note-x-${p.id}`, () => rejectProposalAction(p.id))}
            busy={busy}
          >
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
          </SuggestionCard>
        ))}
      </div>

      {routing && <RoutingCard proposal={routing} caseNumber={caseNumber} offices={offices} busy={busy} run={run} officeName={officeName} />}
      {referral && <ReferralCard proposal={referral} busy={busy} run={run} officeName={officeName} />}
      {followUp && <FollowUpCard proposal={followUp} busy={busy} run={run} />}

      <Decisions proposals={proposals} officeName={officeName} />

      {officeReferrals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink">The office</h3>
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

      <div data-demo="case-outbox">
        <h3 className="text-sm font-semibold text-ink">Outbox for this case ({outbox.length})</h3>
        <p className="text-xs text-slate">Messages that would go to the office. Nothing is sent in this demo.</p>
        {outbox.length === 0 ? (
          <p className="mt-1 text-sm text-slate">Nothing here yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {outbox.map((o) => (
              <OutboxItemView key={o.id} item={o} />
            ))}
          </div>
        )}
      </div>

      <details data-demo="audit-log" open>
        <summary className="cursor-pointer text-sm font-semibold text-ink">History: everything agents and people did ({audit.length})</summary>
        <p className="mt-1 text-xs text-slate">Each step is marked AI agent or Human moderator: what the agents suggested, and what a person approved or changed. Private to moderators.</p>
        <div className="mt-3">
          <AuditTimeline entries={audit} />
        </div>
      </details>
    </section>
  );
}

/**
 * The less common pipeline tools, shown under "More tools" on the case page: ask the Routing
 * Agent again, draft the referral by hand, and set the office yourself. (Past decisions are in the
 * main panel's "Decisions on this case".)
 */
export function PipelineTools({ caseNumber, state, proposals, outbox, offices }: Pick<Props, "caseNumber" | "state" | "proposals" | "outbox" | "offices">) {
  const { busy, result, run } = usePipelineRun();
  const pendingReferral = proposals.some((p) => p.status === "pending" && p.kind === "referral");
  const canDraft = !!state?.officeId && !pendingReferral && !outbox.some((o) => o.kind === "referral");
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-ink/10 p-4">
      <h2 className="text-sm font-semibold text-ink">Agents and routing</h2>
      <ResultNote result={result} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondary} disabled={busy !== null} onClick={() => run("rerun", () => rerunRoutingAction(caseNumber))}>
          {busy === "rerun" ? "Routing Agent is working…" : "Ask the Routing Agent again"}
        </button>
        {canDraft && (
          <button type="button" className={secondary} disabled={busy !== null} onClick={() => run("draft", () => draftReferralAction(caseNumber, "en"))}>
            {busy === "draft" ? "Referral Agent is drafting…" : "Draft the message to the office"}
          </button>
        )}
      </div>
      <ManualRouting caseNumber={caseNumber} state={state} offices={offices} busy={busy} run={run} />
    </section>
  );
}

/**
 * Every suggestion has the same shape: who made it ("Suggested by the Routing Agent") and that
 * it is waiting for a person, what it suggests, why (one sentence) and the confidence when the
 * agent gives one, the Critic Agent's check, then Approve · Change · Dismiss. "Change" opens the
 * editors; nothing is saved until Approve.
 */
export function SuggestionCard({
  id,
  demo,
  madeBy,
  title,
  source,
  suggests,
  why,
  confidence,
  critique,
  failureNote,
  children,
  change,
  changeOpen: changeOpenInitially = false,
  approveLabel = "Approve",
  approveHint,
  onApprove,
  dismissLabel = "Dismiss",
  dismissHint,
  onDismiss,
  busy,
}: {
  id?: string;
  demo?: string;
  /** Who made it, e.g. "Suggested by the Routing Agent" (an agent) or "From the office". */
  madeBy: { text: string; by: "agent" | "office" };
  title: string;
  source: OutputSource;
  suggests: ReactNode;
  why: ReactNode;
  /** 0–1, when the agent gives one. */
  confidence?: number;
  critique?: Critique;
  failureNote?: string;
  children?: ReactNode;
  change?: ReactNode;
  changeOpen?: boolean;
  approveLabel?: string;
  approveHint?: string;
  onApprove: () => void;
  dismissLabel?: string;
  dismissHint?: string;
  onDismiss: () => void;
  busy: string | null;
}) {
  const [changeOpen, setChangeOpen] = useState(changeOpenInitially);
  return (
    <div id={id} tabIndex={id ? -1 : undefined} data-demo={demo} className="scroll-mt-4 rounded-lg border border-teal/40 bg-cream p-3 outline-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MadeBy text={madeBy.text} by={madeBy.by} />
        <WaitingForHuman />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <SourceBadge source={source} />
      </div>
      <dl className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-[6rem_1fr]">
        <dt className="font-semibold text-slate">Suggests</dt>
        <dd className="text-ink">{suggests}</dd>
        <dt className="font-semibold text-slate">Why</dt>
        <dd className="text-ink/85">{why}</dd>
        {confidence !== undefined && (
          <>
            <dt className="font-semibold text-slate">Confidence</dt>
            <dd className="text-ink/85">{Math.round(confidence * 100)}%</dd>
          </>
        )}
      </dl>
      {children}
      <CritiqueView critique={critique} />
      <FailureNote note={failureNote} />
      {change && changeOpen && <div className="mt-3 rounded-md border border-ink/10 bg-surface p-2">{change}</div>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={busy !== null} onClick={onApprove}>
          {approveLabel}
        </button>
        {change && (
          <button type="button" className={secondary} aria-expanded={changeOpen} disabled={busy !== null} onClick={() => setChangeOpen((o) => !o)}>
            {changeOpen ? "Hide changes" : "Change"}
          </button>
        )}
        <button type="button" className={secondary} disabled={busy !== null} onClick={onDismiss}>
          {dismissLabel}
        </button>
      </div>
      {(approveHint || dismissHint) && <p className="mt-1 text-xs text-slate">{[approveHint, dismissHint].filter(Boolean).join(" ")}</p>}
    </div>
  );
}

/** What each suggestion was, in a few words, for the list of decisions. */
function decisionLabel(p: Proposal, officeName: (id?: string) => string): string {
  switch (p.kind) {
    case "routing":
      return `Routing Agent: ${officeName(p.payload.officeId)}, priority ${p.payload.priority}`;
    case "referral":
      return "Referral Agent: message to the office";
    case "follow_up":
      return "Follow-up Agent: reminder and public update";
    case "office_note":
      return "The office’s public note";
    case "office_resolution":
      return "The office says it’s fixed";
    case "weekly_summary":
      return "Summary Agent: weekly summary";
  }
}

/** Every suggestion a person has already decided on: "✓ Approved by moderator · date". */
function Decisions({ proposals, officeName }: { proposals: Proposal[]; officeName: (id?: string) => string }) {
  const decided = proposals
    .filter((p): p is Proposal & { status: "approved" | "rejected" } => p.status !== "pending")
    .sort((a, b) => (b.reviewedAt ?? b.createdAt).localeCompare(a.reviewedAt ?? a.createdAt));
  if (decided.length === 0) return null;
  return (
    <div data-demo="decisions">
      <h3 className="text-sm font-semibold text-ink">Decisions on this case ({decided.length})</h3>
      <ul className="mt-1 flex flex-col gap-1.5 text-sm">
        {decided.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-md border border-ink/10 bg-cream px-3 py-2">
            <span className="min-w-0 text-ink">{decisionLabel(p, officeName)}</span>
            <HumanDecision status={p.status} at={p.reviewedAt} />
          </li>
        ))}
      </ul>
    </div>
  );
}

type CardProps<K extends Proposal["kind"]> = {
  proposal: Extract<Proposal, { kind: K }>;
  busy: string | null;
  run: Run;
};

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
    <SuggestionCard
      id={CARD_IDS.routing}
      demo="routing-card"
      madeBy={{ text: "Suggested by the Routing Agent", by: "agent" }}
      title="Which office, and how urgent"
      source={p.source}
      suggests={
        <>
          <span className="font-semibold">{officeName(p.officeId)}</span> · <PriorityBadge priority={p.priority} />
          {p.alternativeOfficeIds.length > 0 && (
            <span className="mt-0.5 block text-xs text-slate">Could also fit: {p.alternativeOfficeIds.map(officeName).join(", ")}</span>
          )}
        </>
      }
      why={p.reason}
      confidence={p.confidence}
      critique={proposal.critique}
      failureNote={proposal.failureNote}
      changeOpen={p.needsModeratorDecision}
      change={
        <div className="flex flex-wrap items-end gap-2">
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
            Translate the office message for me into
            <select aria-label="Translation language" className={select} value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.code === "es" ? "None (Spanish only)" : l.nativeName}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
      approveLabel={busy === "approve-routing" ? "Approving… (Referral Agent drafting)" : changed ? "Approve with my changes" : "Approve"}
      approveHint="Approving also asks the Referral Agent to draft the message to the office."
      onApprove={() => run("approve-routing", () => approveRoutingAction(proposal.id, { officeId, priority, moderatorLanguage: language }))}
      onDismiss={() => run("reject-routing", () => rejectProposalAction(proposal.id))}
      busy={busy}
    >
      {p.needsModeratorDecision && (
        <p className="mt-2 rounded-md bg-coral/10 p-2 text-xs font-medium text-coral">
          The agent isn’t sure{p.injectionSuspected ? " (the report contains text that looks like instructions to the AI — it was ignored)" : ""}. Please choose the office below.
        </p>
      )}
      {p.possibleDuplicates.length > 0 && (
        <div data-demo="duplicates" className="mt-2 rounded-md border border-ink/10 p-2 text-xs">
          <p className="font-semibold text-ink">Possible duplicate: another report looks like the same problem.</p>
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
    </SuggestionCard>
  );
}

function ReferralCard({ proposal, busy, run, officeName }: CardProps<"referral"> & { officeName: (id?: string) => string }) {
  const p = proposal.payload;
  const [message, setMessage] = useState(p.messageEs);
  const edited = message !== p.messageEs;
  return (
    <SuggestionCard
      id={CARD_IDS.referral}
      demo="referral-card"
      madeBy={{ text: "Drafted by the Referral Agent", by: "agent" }}
      title="Message to the office"
      source={p.source}
      suggests={
        <>
          This message to <span className="font-semibold">{officeName(p.officeId)}</span>
          {edited ? " (with your changes)" : ""}:
          <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-surface p-2 font-sans text-xs text-ink/90">{message}</pre>
        </>
      }
      why={`It explains the problem formally. Code added the exact facts: open ${p.facts.daysOpen} days, ${p.facts.residentCount} resident(s) reported it, and the public link.`}
      critique={proposal.critique}
      failureNote={proposal.failureNote}
      change={
        <label className="block text-xs text-slate">
          Edit the message (Spanish). The same checks run again when you approve.
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={12} className="mt-1 w-full rounded-md border border-ink/15 bg-cream p-2 text-sm text-ink" />
        </label>
      }
      approveLabel={edited ? "Approve with my changes" : "Approve"}
      approveHint="Approving puts it in the outbox. Nothing is sent."
      onApprove={() => run("approve-referral", () => approveReferralAction(proposal.id, edited ? message : undefined))}
      onDismiss={() => run("reject-referral", () => rejectProposalAction(proposal.id))}
      busy={busy}
    >
      {p.translation && !edited && (
        <details className="mt-1 text-xs">
          <summary className="cursor-pointer text-slate">Translation ({p.translation.language})</summary>
          <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-ink/80">{p.translation.text}</pre>
        </details>
      )}
    </SuggestionCard>
  );
}

function FollowUpCard({ proposal, busy, run }: CardProps<"follow_up">) {
  const p = proposal.payload;
  const [reminder, setReminder] = useState(true);
  const [publicUpdate, setPublicUpdate] = useState(true);
  const [escalate, setEscalate] = useState(!!p.escalateTo);
  const changed = !reminder || !publicUpdate || escalate !== !!p.escalateTo;
  const chosen = [
    reminder && "Remind the office (goes to the outbox, not sent)",
    publicUpdate && "Post a status update on the public case page (7 languages)",
    escalate && p.escalateTo && `Raise the priority from ${p.priority} to ${p.escalateTo}`,
  ].filter((x): x is string => !!x);
  return (
    <SuggestionCard
      id={CARD_IDS.follow_up}
      demo="follow-up-card"
      madeBy={{ text: "Suggested by the Follow-up Agent", by: "agent" }}
      title="Follow-up on a case with no progress"
      source={p.source}
      suggests={
        chosen.length === 0 ? (
          <span className="text-slate">Nothing selected. Use Change to pick something, or Dismiss.</span>
        ) : (
          <ul className="list-disc pl-4">
            {chosen.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )
      }
      why={`No progress for ${p.daysWithoutProgress} days. The limit for ${p.priority} cases is ${p.thresholdDays} days.`}
      critique={proposal.critique}
      failureNote={proposal.failureNote}
      change={
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="sr-only">Choose what to approve</legend>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} className="mt-1" />
            <span>
              Reminder to the office
              <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-cream p-2 font-sans text-xs text-ink/80">{p.reminderEs}</pre>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={publicUpdate} onChange={(e) => setPublicUpdate(e.target.checked)} className="mt-1" />
            <span>
              Public status update
              <span className="mt-1 block rounded bg-cream p-2 text-xs text-ink/80">
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
                Raise the priority {p.priority} → <span className="font-semibold">{p.escalateTo}</span>
                {p.escalateReason && <span className="block text-xs text-slate">{p.escalateReason}</span>}
              </span>
            </label>
          )}
        </fieldset>
      }
      approveLabel={changed ? "Approve my selection" : "Approve"}
      onApprove={() => run("approve-follow-up", () => approveFollowUpAction(proposal.id, { reminder, publicUpdate, escalate: escalate && !!p.escalateTo }))}
      onDismiss={() => run("reject-follow-up", () => rejectProposalAction(proposal.id))}
      busy={busy}
    />
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
  run: Run;
}) {
  const [officeId, setOfficeId] = useState(state?.officeId ?? offices[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>(state?.priority ?? "medium");
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold text-ink">Choose the office and priority yourself</summary>
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
