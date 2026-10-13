import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getPipelineDashboardForAdmin } from "@/lib/pipeline/actions";
import { getReferralOffice } from "@/data/referral-offices";
import { listCommunities } from "@/lib/store/community-store";
import { PIPELINE_STAGES, STAGE_LABELS, type Proposal } from "@/lib/pipeline/types";
import { isSendingEnabled } from "@/lib/pipeline/sending";
import { AuditTimeline, OutboxItemView, PriorityBadge } from "@/components/admin/pipeline/bits";
import { ResetDemoButton, RunFollowUpButton, SummaryCard } from "@/components/admin/pipeline/DashboardControls";
import { FOLLOW_UP_AFTER_DAYS } from "@/lib/pipeline/schedule";

// "Run follow-up now" runs the Follow-up Agent (several Groq calls) inside this page's action.
export const maxDuration = 120;

const KIND_LABELS: Record<Proposal["kind"], string> = {
  routing: "Routing",
  referral: "Referral draft",
  follow_up: "Follow-up",
  weekly_summary: "Weekly summary",
  office_note: "Office public note",
  office_resolution: "Office says resolved",
};

export default async function PipelineDashboardPage() {
  // Same page-level guard as every admin page (see admin/page.tsx).
  if (!(await isAdminAuthenticated())) return null;
  const [dashboard, communities] = await Promise.all([getPipelineDashboardForAdmin(), listCommunities()]);
  const { rows, pending, outbox, overdue, recentAudit } = dashboard;
  const areaName: Record<string, string> = Object.fromEntries(communities.flatMap((c) => c.areas.map((a) => [a.id, a.label])));
  const summaries = pending.filter((p): p is Extract<Proposal, { kind: "weekly_summary" }> => p.kind === "weekly_summary");
  const casePending = pending.filter((p) => p.kind !== "weekly_summary");

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Agentic pipeline</h1>
          <p className="mt-1 text-sm text-slate">
            Drafted → Routed → Reviewed by agents → Referral prepared (sending paused) → Follow-up. Agents propose; moderators decide.
          </p>
        </div>
        <p className="w-max max-w-full rounded-md border border-ink/15 bg-cream px-3 py-2 text-sm text-ink">
          Sending: <span className="font-semibold">{isSendingEnabled() ? "flag on, but there is no delivery channel — nothing is sent" : "OFF (demo mode)"}</span>. The outbox only
          shows what would be sent.
        </p>
        <div className="rounded-lg border border-teal/40 bg-mint/10 p-4">
          <h2 className="text-sm font-semibold text-ink">Follow-up Agent</h2>
          <p className="mb-3 mt-1 text-xs text-slate">
            Runs every day on a schedule. It flags cases with no progress for {FOLLOW_UP_AFTER_DAYS.urgent} days (urgent), {FOLLOW_UP_AFTER_DAYS.high} (high),{" "}
            {FOLLOW_UP_AFTER_DAYS.medium} (medium) or {FOLLOW_UP_AFTER_DAYS.low} (low), drafts the weekly summary, and routes older cases that were never routed.
          </p>
          <RunFollowUpButton />
        </div>
        <div className="rounded-lg border border-coral/30 p-4">
          <h2 className="text-sm font-semibold text-ink">Reset demo</h2>
          <p className="mb-3 mt-1 text-xs text-slate">
            Puts the 8 example cases back to their starting state (stages, suggestions, outbox, timeline, audit log), so you can show the demo
            again. Resident cases are never touched.
          </p>
          <ResetDemoButton />
        </div>
      </section>

      <section aria-labelledby="stages" className="flex flex-col gap-3">
        <h2 id="stages" className="text-sm font-semibold text-ink">
          Cases by stage
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE_STAGES.map((stage, i) => {
            const inStage = rows.filter((r) => r.stage === stage && !r.isDuplicateOf);
            return (
              <div key={stage} className="rounded-lg border border-ink/10 p-3">
                <p className="text-xs font-semibold text-slate">
                  {i + 1}. {STAGE_LABELS[stage]}
                </p>
                <p className="text-2xl font-semibold text-ink">{inStage.length}</p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {inStage.map((r) => (
                    <li key={r.caseNumber}>
                      <Link href={`/admin/cases/${r.caseNumber}`} className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-teal underline">
                        {r.caseNumber}
                        {r.isDemo && <span className="text-slate no-underline"> (example)</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="pending" className="flex flex-col gap-3">
        <h2 id="pending" className="text-sm font-semibold text-ink">
          Waiting for a moderator ({pending.length})
        </h2>
        {casePending.length === 0 && summaries.length === 0 && <p className="text-sm text-slate">Nothing waiting.</p>}
        <ul className="flex flex-col gap-2">
          {casePending.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/cases/${p.caseNumber}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink/10 p-3 text-sm hover:bg-mint/20">
                <span className="font-semibold text-ink">{p.caseNumber}</span>
                <span className="rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">{KIND_LABELS[p.kind]}</span>
                {p.kind === "routing" && (
                  <span className="text-xs text-ink/80">
                    {getReferralOffice(p.payload.officeId)?.name} · {Math.round(p.payload.confidence * 100)}%{p.payload.needsModeratorDecision && " · needs your decision"}
                    {p.payload.possibleDuplicates.length > 0 && " · possible duplicate"}
                  </span>
                )}
                {p.kind === "follow_up" && <span className="text-xs text-ink/80">no progress for {p.payload.daysWithoutProgress} days</span>}
                <span className={`text-xs ${p.critique?.verdict === "concerns" ? "text-coral" : "text-teal"}`}>
                  {p.critique?.verdict === "concerns" ? "⚠ Critic has concerns" : "✓ Critic: OK"}
                </span>
                <span className="text-xs text-slate">{new Date(p.createdAt).toLocaleString()}</span>
              </Link>
            </li>
          ))}
        </ul>
        {summaries.map((s) => (
          <SummaryCard key={s.id} proposal={s} areaName={areaName} />
        ))}
      </section>

      <section aria-labelledby="overdue" className="flex flex-col gap-3">
        <h2 id="overdue" className="text-sm font-semibold text-ink">
          Overdue cases ({overdue.length})
        </h2>
        {overdue.length === 0 ? (
          <p className="text-sm text-slate">No case is past its follow-up limit.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {overdue.map((o) => (
              <li key={o.caseNumber} className="flex flex-wrap items-center gap-2 rounded-lg border border-coral/30 p-3 text-sm">
                <Link href={`/admin/cases/${o.caseNumber}`} className="font-semibold text-teal underline">
                  {o.caseNumber}
                </Link>
                <PriorityBadge priority={o.priority} />
                <span className="text-ink/80">
                  no progress for {o.daysWithoutProgress} days (limit {o.thresholdDays})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="outbox" className="flex flex-col gap-3">
        <h2 id="outbox" className="text-sm font-semibold text-ink">
          Outbox — dry run ({outbox.length})
        </h2>
        <p className="text-xs text-slate">Exactly what would be sent, and to which office. Every item is “Ready to send – demo mode (not sent)”.</p>
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

      <section aria-labelledby="activity" className="flex flex-col gap-3">
        <h2 id="activity" className="text-sm font-semibold text-ink">
          Recent agent activity
        </h2>
        <AuditTimeline entries={recentAudit} showCase />
      </section>
    </div>
  );
}
