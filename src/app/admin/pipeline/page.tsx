import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getPipelineDashboardForAdmin } from "@/lib/pipeline/actions";
import { getReferralOffice } from "@/data/referral-offices";
import { listCommunities } from "@/lib/store/community-store";
import type { Proposal } from "@/lib/pipeline/types";
import { CARD_IDS, DISPLAY_STEPS, DISPLAY_STEP_HINTS, DISPLAY_STEP_LABELS } from "@/lib/pipeline/display";
import { isSendingEnabled } from "@/lib/pipeline/sending";
import { AuditTimeline, MadeBy, OutboxItemView, PriorityBadge, WaitingForHuman } from "@/components/admin/pipeline/bits";
import { ResetDemoButton, RunFollowUpButton, StartDemoButton, SummaryCard } from "@/components/admin/pipeline/DashboardControls";
import { FOLLOW_UP_AFTER_DAYS } from "@/lib/pipeline/schedule";
import { isDemoGuideOn, onlyExamples } from "@/lib/demo-guide/demo-mode";

// "Run follow-up now" runs the Follow-up Agent (several Groq calls) inside this page's action.
export const maxDuration = 120;

type CaseProposal = Exclude<Proposal, { kind: "weekly_summary" }>;

/** One line in "What needs your attention": what the agent wants, in plain words. */
/** Who made a suggestion, as shown on its card. */
function madeByOf(p: CaseProposal): string {
  switch (p.kind) {
    case "routing":
      return "Suggested by the Routing Agent";
    case "referral":
      return "Drafted by the Referral Agent";
    case "follow_up":
      return "Suggested by the Follow-up Agent";
    case "office_note":
      return "From the office · translated by AI";
    case "office_resolution":
      return "From the office";
  }
}

function describe(p: CaseProposal): string {
  switch (p.kind) {
    case "routing":
      return `Suggests ${getReferralOffice(p.payload.officeId)?.name ?? "an office"}${p.payload.needsModeratorDecision ? " (not sure, needs you)" : ""}${
        p.payload.possibleDuplicates.length > 0 ? " · possible duplicate" : ""
      }`;
    case "referral":
      return "A message to the office";
    case "follow_up":
      return `No progress for ${p.payload.daysWithoutProgress} days`;
    case "office_note":
      return "The office wrote a public note for you to check";
    case "office_resolution":
      return "The office says it’s fixed: confirm to close";
  }
}

const btn = "shrink-0 rounded-md bg-teal px-3 py-1.5 text-sm font-semibold text-cream";

export default async function PipelineDashboardPage() {
  // Same page-level guard as every admin page (see admin/page.tsx).
  if (!(await isAdminAuthenticated())) return null;
  const [dashboard, communities, demoOn] = await Promise.all([getPipelineDashboardForAdmin(), listCommunities(), isDemoGuideOn()]);
  const isExample = new Map(dashboard.rows.map((r) => [r.caseNumber, r.isDemo]));
  const example = (caseNumber?: string) => !!caseNumber && isExample.get(caseNumber) === true;
  // While the demo guide is on, only example cases (see demo-mode.ts): a recording never shows a resident's report.
  const rows = onlyExamples(dashboard.rows, (r) => r.isDemo, demoOn);
  const pending = onlyExamples(dashboard.pending, (p) => p.kind !== "weekly_summary" && example(p.caseNumber), demoOn);
  const outbox = onlyExamples(dashboard.outbox, (o) => example(o.caseNumber), demoOn);
  const overdue = onlyExamples(dashboard.overdue, (o) => example(o.caseNumber), demoOn);
  const recentAudit = onlyExamples(dashboard.recentAudit, (e) => example(e.caseNumber), demoOn);
  const hiddenResidentCases = demoOn ? dashboard.rows.filter((r) => !r.isDemo).length : 0;
  const areaName: Record<string, string> = Object.fromEntries(communities.flatMap((c) => c.areas.map((a) => [a.id, a.label])));
  const summaries = pending.filter((p): p is Extract<Proposal, { kind: "weekly_summary" }> => p.kind === "weekly_summary");
  const casePending = pending.filter((p): p is CaseProposal => p.kind !== "weekly_summary");
  const tag = (caseNumber?: string) => (caseNumber && isExample.get(caseNumber) ? "example" : "resident report");
  const nothing = casePending.length === 0 && summaries.length === 0 && overdue.length === 0 && outbox.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Home</h1>
          <p className="mt-1 text-sm text-slate">What needs you today.</p>
        </div>
        <p data-demo="human-in-the-loop" className="flex max-w-full items-start gap-2 rounded-md border-l-4 border-teal bg-mint/20 px-3 py-2 text-sm text-ink">
          <span>
            <span className="font-semibold">Human in the loop:</span> AI agents suggest, a human approves every step. Nothing is sent outside.
          </span>
        </p>
        <p className="w-max max-w-full rounded-md border border-ink/15 bg-cream px-3 py-2 text-sm text-ink">
          Sending: <span className="font-semibold">{isSendingEnabled() ? "flag on, but there is no delivery channel — nothing is sent" : "OFF (demo mode)"}</span>
        </p>
      </section>

      {hiddenResidentCases > 0 && (
        <p role="note" className="rounded-md border border-[#f5c542] bg-[#f5c542]/10 px-3 py-2 text-sm text-ink">
          Demo guide is on: {hiddenResidentCases} resident report{hiddenResidentCases === 1 ? " is" : "s are"} hidden, so only example cases show. Exit the guide
          to see {hiddenResidentCases === 1 ? "it" : "them"}.
        </p>
      )}

      <section aria-labelledby="attention" data-demo="attention" className="flex flex-col gap-4 rounded-lg border-2 border-teal p-4">
        <h2 id="attention" className="text-base font-semibold text-ink">
          What needs your attention
        </h2>
        {nothing && <p className="text-sm text-ink">✓ All caught up. Nothing is waiting for you.</p>}

        {(casePending.length > 0 || summaries.length > 0) && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink">Suggestions waiting for approval ({casePending.length + summaries.length})</h3>
            <ul className="flex flex-col gap-2">
              {casePending.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink/10 bg-cream p-3 text-sm">
                  <span className="flex min-w-0 flex-col gap-1">
                    <span>
                      <span className="font-semibold text-ink">{p.caseNumber}</span> <span className="text-xs text-slate">({tag(p.caseNumber)})</span>
                    </span>
                    <MadeBy text={madeByOf(p)} by={p.kind.startsWith("office_") ? "office" : "agent"} />
                    <span className="text-ink/85">{describe(p)}</span>
                    <span>
                      <WaitingForHuman />
                    </span>
                  </span>
                  <Link href={`/admin/cases/${p.caseNumber}#${CARD_IDS[p.kind]}`} className={btn}>
                    Review
                  </Link>
                </li>
              ))}
              {summaries.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink/10 bg-cream p-3 text-sm">
                  <span className="flex min-w-0 flex-col gap-1">
                    <MadeBy text="Drafted by the Summary Agent" />
                    <span className="text-ink/85">Weekly summary for the week of {s.payload.weekStart} is ready to publish</span>
                    <span>
                      <WaitingForHuman />
                    </span>
                  </span>
                  <a href="#weekly-summaries" className={btn}>
                    Review
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {overdue.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink">Overdue cases ({overdue.length})</h3>
            <ul className="flex flex-col gap-2">
              {overdue.map((o) => (
                <li key={o.caseNumber} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-coral/30 bg-cream p-3 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">{o.caseNumber}</span> <span className="text-xs text-slate">({tag(o.caseNumber)})</span>{" "}
                    <PriorityBadge priority={o.priority} />
                    <span className="block text-ink/85">
                      No progress for {o.daysWithoutProgress} days (the limit is {o.thresholdDays})
                    </span>
                  </span>
                  <Link href={`/admin/cases/${o.caseNumber}`} className={btn}>
                    Open case
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {outbox.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink/10 bg-cream p-3 text-sm">
            <span className="text-ink/85">
              <span className="font-semibold text-ink">Outbox:</span> {outbox.length} message{outbox.length === 1 ? "" : "s"} ready (not sent)
            </span>
            <a href="#outbox" className={btn}>
              View outbox
            </a>
          </div>
        )}
      </section>

      <section aria-labelledby="stages" data-demo="pipeline-stages" className="flex flex-col gap-3">
        <div>
          <h2 id="stages" className="text-sm font-semibold text-ink">
            Cases by step
          </h2>
          <p className="text-xs text-slate">Every case moves Drafted → Routed → Referral ready → Office → Follow-up. Click a case to open it.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {DISPLAY_STEPS.map((step, i) => {
            const inStep = rows.filter((r) => r.displayStep === step && !r.isDuplicateOf);
            return (
              <div key={step} className="rounded-lg border border-ink/10 p-3">
                <p className="text-xs font-semibold text-slate">
                  {i + 1}. {DISPLAY_STEP_LABELS[step]}
                </p>
                <p className="text-2xl font-semibold text-ink">{inStep.length}</p>
                <p className="text-xs text-slate">{DISPLAY_STEP_HINTS[step]}</p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {inStep.map((r) => (
                    <li key={r.caseNumber}>
                      <Link href={`/admin/cases/${r.caseNumber}`} className="inline-flex flex-col rounded-md bg-ink/5 px-2 py-0.5 text-xs leading-tight text-teal">
                        <span className="underline">{r.caseNumber}</span>
                        <span className="text-[11px] text-slate">{r.isDemo ? "example" : "resident report"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="demo-tools" className="flex flex-col gap-4 rounded-lg border-2 border-[#f5c542] p-4">
        <div>
          <h2 id="demo-tools" className="text-sm font-semibold text-ink">
            Demo tools
          </h2>
          <p className="mt-1 text-xs text-slate">
            Reports you submit while signed in here are test reports: labelled “Ejemplo”, they go all the way to the Demo office. These tools only
            ever touch example cases and your test reports. Residents’ reports are never changed.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-slate">Run follow-up now: the Follow-up Agent normally runs every morning by itself. This runs it now, on example cases only.</p>
          <RunFollowUpButton onlyExamples />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-slate">Reset demo: deletes your test reports and puts the example cases back to the start.</p>
          <ResetDemoButton />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-slate">Optional: a step-by-step guide box that only you see.</p>
          <StartDemoButton />
        </div>
      </section>

      {summaries.length > 0 && (
        <section id="weekly-summaries" aria-labelledby="summaries-title" className="flex scroll-mt-4 flex-col gap-3">
          <h2 id="summaries-title" className="text-sm font-semibold text-ink">
            Weekly summaries to publish
          </h2>
          {summaries.map((s) => (
            <SummaryCard key={s.id} proposal={s} areaName={areaName} />
          ))}
        </section>
      )}

      <section id="outbox" aria-labelledby="outbox-title" className="flex scroll-mt-4 flex-col gap-3">
        <h2 id="outbox-title" className="text-sm font-semibold text-ink">
          Outbox ({outbox.length})
        </h2>
        <p className="text-xs text-slate">Messages that would go to offices. Nothing is sent in this demo: every item says “Ready to send – demo mode (not sent)”.</p>
        {outbox.length === 0 ? (
          <p className="text-sm text-slate">Empty.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {outbox.map((o) => (
              <OutboxItemView key={o.id} item={o} showCase />
            ))}
          </div>
        )}
      </section>

      <details className="rounded-lg border border-ink/10 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Recent activity (agents and people)</summary>
        <div className="mt-3">
          <AuditTimeline entries={recentAudit} showCase />
        </div>
      </details>

      <details className="rounded-lg border border-ink/10 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">More tools</summary>
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-slate">
            Run follow-up on <span className="font-semibold">all</span> cases, including resident reports, exactly like the daily schedule does. It
            flags cases with no progress for {FOLLOW_UP_AFTER_DAYS.urgent} days (urgent), {FOLLOW_UP_AFTER_DAYS.high} (high), {FOLLOW_UP_AFTER_DAYS.medium}{" "}
            (medium) or {FOLLOW_UP_AFTER_DAYS.low} (low), drafts the weekly summary, and routes older cases that were never routed. Everything still waits
            for you.
          </p>
          <RunFollowUpButton />
        </div>
      </details>
    </div>
  );
}
