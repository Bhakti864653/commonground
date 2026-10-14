import type Groq from "groq-sdk";
import { getGroqClient } from "@/lib/guide/groq-client";
import { detectEmergencyPhrase } from "@/lib/guide/emergency";
import { getReferralOffice, type ReferralOffice } from "@/data/referral-offices";
import { addTimelineEvent, getCaseByCaseNumber, listAllCasesForAdmin, listCasesForCommunity, markDuplicate } from "@/lib/store/case-store";
import { getCommunity } from "@/lib/store/community-store";
import { publicCaseUrl } from "@/lib/site-url";
import { isLanguage, LANGUAGE_CODES, type Language } from "@/lib/i18n/languages";
import type { Case } from "@/lib/schema/report";
import type { OfficeReferral } from "@/lib/office/types";
import { asTimelineNote } from "./store/demo-pipeline-data";
import { getPipelineRepository } from "./store";
import { displayStepOf } from "./display";
import { getOfficeRepository } from "@/lib/office/store";
import { deliverOutboxItem, OUTBOX_STATUS_LABEL } from "./sending";
import { findOverdueCases, MAX_FOLLOW_UPS_PER_RUN, weekStartOf, type FollowUpCandidate } from "./schedule";
import { containsPersonalInfo, type PiiKind } from "./redact";
import { runRoutingAgent } from "./agents/routing-agent";
import { runReferralAgent, checkOutgoingMessage } from "./agents/referral-agent";
import { runCriticAgent } from "./agents/critic-agent";
import { runFollowUpAgent, runSummaryHighlight } from "./agents/follow-up-agent";
import { residentCount } from "./agents/context";
import { computeWeeklyStats } from "./weekly-summary";
import {
  PrioritySchema,
  type CasePipelineState,
  type NewProposal,
  type PipelineStage,
  type Priority,
  type Proposal,
} from "./types";

/**
 * The agentic pipeline: Drafted → Routed → Reviewed by agents → Referral prepared (sending
 * paused) → Follow-up.
 *
 * Agents only ever PROPOSE (pipeline_proposals) and log what they did (agent_audit). Everything
 * that changes a case or publishes anything happens in the `approve…` functions below, which a
 * moderator triggers — and they use the same store functions as the manual moderation buttons
 * (addTimelineEvent, markDuplicate, the routing setter). Nothing is ever sent anywhere: approved
 * messages go to the dry-run outbox (sending.ts).
 */

const repo = () => getPipelineRepository();

export type PipelineResult = { ok: true; message?: string } | { ok: false; reason: string };

async function audit(c: Pick<Case, "publicCaseNumber" | "communityId"> | null, communityId: string, actorType: "agent" | "moderator" | "system", actor: string, action: string, summary: string) {
  await repo().addAudit({ caseNumber: c?.publicCaseNumber, communityId: c?.communityId ?? communityId, actorType, actor, action, summary: summary.slice(0, 1000) });
}

function describeTools(toolCalls: string[]): string {
  return toolCalls.length ? ` Tools used: ${toolCalls.join(" → ")}.` : "";
}

/** Runs the Critic on a proposal, logs it, and stores the proposal for a moderator. */
export async function proposeWithCritique(client: Groq | null, proposal: NewProposal, c: Case | undefined, now: Date): Promise<Proposal> {
  const community = c ? await getCommunity(c.communityId) : await getCommunity(proposal.communityId);
  const review = await runCriticAgent(client, proposal, c, community, now);
  const critique = review.critique;
  await audit(
    c ?? null,
    proposal.communityId,
    "agent",
    "Critic Agent",
    "critique",
    critique.verdict === "ok"
      ? `Reviewed the ${proposal.kind.replace("_", " ")}: no problems found${critique.source === "rules" ? " (rule checks only — AI review unavailable)" : ""}.`
      : `Reviewed the ${proposal.kind.replace("_", " ")}: ${critique.issues.map((i) => `[${i.type}] ${i.note}`).join(" ")}`,
  );
  return repo().addProposal({ ...proposal, critique });
}

// ---- 1. Drafting → 2. Routing (runs after a case is submitted) ------------------------------

export type IntakeInfo = { title?: string; redacted?: PiiKind[] };

/**
 * After a resident submits: record the intake (title, emergency flag, any redaction), then run
 * the Routing Agent and the Critic. Never throws — a failure is logged for moderators.
 */
export async function runIntake(caseNumber: string, intake: IntakeInfo = {}, now = new Date()): Promise<void> {
  const c = await getCaseByCaseNumber(caseNumber);
  if (!c) return;
  const emergency = detectEmergencyPhrase(c.description);
  await repo().upsertState(caseNumber, c.communityId, {
    ...(intake.title ? { title: intake.title.slice(0, 120) } : {}),
    emergency,
    lastProgressAt: c.createdAt,
  });
  await audit(c, c.communityId, "agent", "Guide", "drafted", `Case submitted${intake.title ? ` ("${intake.title.slice(0, 80)}")` : ""}, confirmed by the resident.${emergency ? " Matches an emergency phrase: the resident was told to call 911, and the case is marked urgent." : ""}`);
  if (intake.redacted?.length) {
    await audit(c, c.communityId, "agent", "Privacy filter", "pii_redacted", `Removed personal details before saving: ${intake.redacted.join(", ")}. The removed text was never stored.`);
  }
  await runRouting(caseNumber, now);
}

/** Routing Agent + Critic → a pending routing proposal. Also what "Re-run routing" calls. */
export async function runRouting(
  caseNumber: string,
  now = new Date(),
  excluded: Array<{ officeId: string; reason: string }> = [],
): Promise<PipelineResult> {
  const c = await getCaseByCaseNumber(caseNumber);
  if (!c) return { ok: false, reason: "Case not found." };
  const community = await getCommunity(c.communityId);
  const client = getGroqClient();
  const outcome = await runRoutingAgent(client, c, community, now, excluded);
  const office = getReferralOffice(outcome.payload.officeId);
  const p = outcome.payload;
  await audit(
    c,
    c.communityId,
    "agent",
    "Routing Agent",
    "routing_proposed",
    `Suggested ${office?.name ?? p.officeId}, priority ${p.priority}, confidence ${Math.round(p.confidence * 100)}%. ${p.reason}` +
      (p.needsModeratorDecision ? " Asked the moderator to decide." : "") +
      (p.possibleDuplicates.length ? ` Possible duplicates: ${p.possibleDuplicates.map((d) => d.caseNumber).join(", ")}.` : "") +
      (p.injectionSuspected ? " The report contains text that looks like instructions to the AI; it was ignored." : "") +
      describeTools(outcome.toolCalls) +
      (outcome.failureNote ? ` ${outcome.failureNote}` : ""),
  );
  await proposeWithCritique(client, { kind: "routing", caseNumber, communityId: c.communityId, payload: p, failureNote: outcome.failureNote }, c, now);
  return { ok: true };
}

/** The same routing setter a moderator's manual "set office & priority" uses. */
export async function setRouting(c: Case, officeId: string, priority: Priority, moderator: string, now: Date, why: string) {
  const office = getReferralOffice(officeId);
  if (!office) return null;
  const state = await repo().upsertState(c.publicCaseNumber, c.communityId, {
    officeId,
    priority,
    routedAt: now.toISOString(),
    lastProgressAt: now.toISOString(),
  });
  await audit(c, c.communityId, "moderator", moderator, "routing_set", `${why} Office: ${office.name}. Priority: ${priority}.`);
  return state;
}

/**
 * A moderator accepts the routing (optionally changing office/priority). Then the Referral Agent
 * drafts the message, the Critic reviews it, and it waits for the moderator.
 */
export async function approveRouting(
  proposalId: string,
  moderator: string,
  change: { officeId?: string; priority?: Priority; moderatorLanguage?: Language } = {},
  now = new Date(),
): Promise<PipelineResult> {
  const proposal = await repo().getProposal(proposalId);
  if (!proposal || proposal.kind !== "routing" || proposal.status !== "pending" || !proposal.caseNumber) {
    return { ok: false, reason: "This routing suggestion is no longer pending." };
  }
  const c = await getCaseByCaseNumber(proposal.caseNumber);
  if (!c || c.removal) return { ok: false, reason: "The case is gone or its content was removed." };
  const officeId = change.officeId ?? proposal.payload.officeId;
  const priorityParse = PrioritySchema.safeParse(change.priority ?? proposal.payload.priority);
  if (!getReferralOffice(officeId) || !priorityParse.success) return { ok: false, reason: "Unknown office or priority." };
  const changed = officeId !== proposal.payload.officeId || priorityParse.data !== proposal.payload.priority;

  const reviewed = await repo().reviewProposal(proposal.id, "approved", moderator, { ...proposal.payload, officeId, priority: priorityParse.data }, now);
  if (!reviewed) return { ok: false, reason: "This routing suggestion is no longer pending." };
  await setRouting(
    c,
    officeId,
    priorityParse.data,
    moderator,
    now,
    changed
      ? `Changed the Routing Agent's suggestion (${proposal.payload.officeId}, ${proposal.payload.priority}) and approved it.`
      : "Approved the Routing Agent's suggestion.",
  );
  return draftReferral(c.publicCaseNumber, change.moderatorLanguage ?? "en", now);
}

export async function rejectProposal(proposalId: string, moderator: string, now = new Date()): Promise<PipelineResult> {
  const proposal = await repo().getProposal(proposalId);
  if (!proposal || proposal.status !== "pending") return { ok: false, reason: "This suggestion is no longer pending." };
  const reviewed = await repo().reviewProposal(proposalId, "rejected", moderator, undefined, now);
  if (!reviewed) return { ok: false, reason: "This suggestion is no longer pending." };
  const c = proposal.caseNumber ? await getCaseByCaseNumber(proposal.caseNumber) : undefined;
  await audit(c ?? null, proposal.communityId, "moderator", moderator, `${proposal.kind}_dismissed`, `Dismissed the ${proposal.kind.replace("_", " ")} suggestion. Nothing changed.`);
  return { ok: true };
}

/** Merge a likely duplicate into the original, through the same markDuplicate the manual button uses. */
export async function mergeDuplicate(caseNumber: string, intoCaseNumber: string, moderator: string): Promise<PipelineResult> {
  const c = await getCaseByCaseNumber(caseNumber);
  if (!c) return { ok: false, reason: "Case not found." };
  if (!(await markDuplicate(caseNumber, intoCaseNumber, moderator))) return { ok: false, reason: "Couldn't mark it as a duplicate." };
  await audit(c, c.communityId, "moderator", moderator, "merged_duplicate", `Merged into ${intoCaseNumber} (marked as a duplicate). It now counts as one more resident reporting ${intoCaseNumber}.`);
  for (const p of await repo().listProposals({ caseNumber, status: "pending" })) {
    await repo().reviewProposal(p.id, "rejected", moderator);
  }
  return { ok: true, message: `Merged into ${intoCaseNumber}.` };
}

// ---- 3. Sending (dry run) ------------------------------------------------------------------

/** Referral Agent + Critic → a pending referral proposal for the case's approved office. */
export async function draftReferral(caseNumber: string, moderatorLanguage: Language = "en", now = new Date()): Promise<PipelineResult> {
  const c = await getCaseByCaseNumber(caseNumber);
  const state = await repo().getState(caseNumber);
  if (!c || !state?.officeId) return { ok: false, reason: "Approve the routing first." };
  const office = getReferralOffice(state.officeId);
  if (!office) return { ok: false, reason: "Unknown office." };
  const client = getGroqClient();
  const language = isLanguage(moderatorLanguage) ? moderatorLanguage : "en";
  const outcome = await runReferralAgent(client, c, await getCommunity(c.communityId), office, language, now);
  await audit(c, c.communityId, "agent", "Referral Agent", "referral_drafted", `Drafted a referral in Spanish${outcome.payload.translation ? ` (with a ${outcome.payload.translation.language} translation)` : ""} to ${office.name}.${describeTools(outcome.toolCalls)}${outcome.failureNote ? ` ${outcome.failureNote}` : ""}`);
  await proposeWithCritique(client, { kind: "referral", caseNumber, communityId: c.communityId, payload: outcome.payload, failureNote: outcome.failureNote }, c, now);
  return { ok: true, message: outcome.failureNote ?? "Routing approved. The Referral Agent drafted a message for your review." };
}

/** The outbox writer — the only way anything enters the outbox, always as a dry run. */
export async function addToOutbox(
  c: Case,
  office: ReferralOffice,
  kind: "referral" | "follow_up",
  bodyEs: string,
  approvedBy: string,
  translation: { language: Language; text: string } | undefined,
  now: Date,
) {
  const item = await repo().addOutboxItem(
    {
      caseNumber: c.publicCaseNumber,
      communityId: c.communityId,
      officeId: office.id,
      kind,
      toLabel: office.nameEs,
      toAddress: office.contact.email,
      subject: kind === "referral" ? `Caso ${c.publicCaseNumber} – CommonGround` : `Recordatorio: caso ${c.publicCaseNumber} – CommonGround`,
      bodyEs,
      translation,
      approvedBy,
    },
    now,
  );
  const delivery = await deliverOutboxItem(item);
  await audit(c, c.communityId, "system", "Outbox", "outbox_queued", `Added a ${kind === "referral" ? "referral" : "reminder"} for ${office.name} to the outbox: "${OUTBOX_STATUS_LABEL}". ${delivery.mode === "dry_run" ? "Sending is off (SENDING_ENABLED is false)." : delivery.reason}`);
  return item;
}

export async function approveReferral(proposalId: string, moderator: string, edits: { messageEs?: string } = {}, now = new Date()): Promise<PipelineResult> {
  const proposal = await repo().getProposal(proposalId);
  if (!proposal || proposal.kind !== "referral" || proposal.status !== "pending" || !proposal.caseNumber) {
    return { ok: false, reason: "This referral is no longer pending." };
  }
  const c = await getCaseByCaseNumber(proposal.caseNumber);
  const office = getReferralOffice(proposal.payload.officeId);
  if (!c || c.removal || !office) return { ok: false, reason: "The case is gone or its content was removed." };
  const messageEs = (edits.messageEs ?? proposal.payload.messageEs).trim();
  const check = checkOutgoingMessage(messageEs, c.publicCaseNumber, publicCaseUrl(c.publicCaseNumber));
  if (!check.ok) return { ok: false, reason: check.reason };
  const edited = messageEs !== proposal.payload.messageEs;

  const reviewed = await repo().reviewProposal(proposal.id, "approved", moderator, { ...proposal.payload, messageEs }, now);
  if (!reviewed) return { ok: false, reason: "This referral is no longer pending." };
  await audit(c, c.communityId, "moderator", moderator, "referral_approved", `Approved the referral${edited ? " after editing it" : ""}.`);
  const item = await addToOutbox(c, office, "referral", messageEs, moderator, edited ? undefined : proposal.payload.translation, now);
  // It also arrives in the office's inbox (inside CommonGround). Real offices can only see it once
  // OFFICE_PORTAL_ENABLED is on; example cases go to the simulated demo office.
  await getOfficeRepository().createReferral({ caseNumber: c.publicCaseNumber, communityId: c.communityId, officeId: office.id, isDemo: c.sourceType === "demonstration", outboxId: item.id }, now);
  // Public, and fixed text: "Referral prepared – sending is paused in this demo". No office named.
  await addTimelineEvent(c.publicCaseNumber, { kind: "referral_queued", actorType: "moderator" }, () => now);
  await repo().upsertState(c.publicCaseNumber, c.communityId, { referralQueuedAt: now.toISOString(), lastProgressAt: now.toISOString() });
  return {
    ok: true,
    message:
      c.sourceType === "demonstration"
        ? "Added to the outbox: Ready to send – demo mode (not sent)."
        : "Added to the outbox: Ready to send – demo mode (not sent). This is a resident's case, so nothing about it is shown publicly.",
  };
}

// ---- 4. Follow-up (scheduled) --------------------------------------------------------------

export type FollowUpRunReport = {
  trigger: "cron" | "manual";
  routedCatchUp: string[];
  flagged: string[];
  summaries: string[];
  skippedForTime: number;
  notes: string[];
};

/**
 * A run stops starting new AI work after this long, so it fits in one serverless request (the
 * cron route and the admin pages allow 120 s; Groq's free tier can be slow when it rate-limits).
 */
const TIME_BUDGET_MS = 90_000;
const MAX_CATCH_UP_ROUTING = 3;

/** The most recent office referral per case (a case re-routed to another office has several). */
function latestOfficeReferrals(referrals: OfficeReferral[]): Map<string, OfficeReferral> {
  const latest = new Map<string, OfficeReferral>();
  for (const r of referrals) {
    const current = latest.get(r.caseNumber);
    if (!current || r.createdAt > current.createdAt) latest.set(r.caseNumber, r);
  }
  return latest;
}

function lastProgress(c: Case, state: CasePipelineState | undefined): string {
  const statusTimes = c.statusHistory.filter((e) => (e.kind ?? "status") === "status").map((e) => e.occurredAt);
  return [c.createdAt, state?.lastProgressAt, ...statusTimes].filter((t): t is string => !!t).sort().at(-1)!;
}

/**
 * The Follow-up Agent's run. `onlyExamples` (the demo guide's "example cases only" button) limits
 * it to the demonstration cases: no resident case is flagged or routed, and no community-wide
 * weekly summary (which would count residents' cases) is drafted.
 */
export async function runFollowUp(
  trigger: "cron" | "manual",
  now = new Date(),
  options: { onlyExamples?: boolean } = {},
): Promise<FollowUpRunReport> {
  const started = Date.now();
  const outOfTime = () => Date.now() - started > TIME_BUDGET_MS;
  const report: FollowUpRunReport = { trigger, routedCatchUp: [], flagged: [], summaries: [], skippedForTime: 0, notes: [] };
  const client = getGroqClient();
  if (!client) report.notes.push("The AI isn't configured: rule-based drafts only.");
  const actor = trigger === "cron" ? "scheduler (daily cron)" : "moderator (Run follow-up now)";

  const cases = (await listAllCasesForAdmin()).filter((c) => !c.removal && (!options.onlyExamples || c.sourceType === "demonstration"));
  const states = new Map((await repo().listStates()).map((s) => [s.caseNumber, s]));
  const proposals = await repo().listProposals();
  const pendingFollowUp = new Set(proposals.filter((p) => p.kind === "follow_up" && p.status === "pending").map((p) => p.caseNumber));
  const hasRouting = new Set(proposals.filter((p) => p.kind === "routing").map((p) => p.caseNumber));
  const officeByCase = latestOfficeReferrals(await getOfficeRepository().listAll());

  // Follow-ups first (the reason for the run), then the weekly summary, then catch-up routing.
  const candidates: FollowUpCandidate[] = cases.flatMap((c) => {
    const s = states.get(c.publicCaseNumber);
    if (!s?.priority || !s.officeId) return [];
    return [{
      caseNumber: c.publicCaseNumber,
      priority: s.priority,
      lastProgressAt: lastProgress(c, s),
      status: c.status,
      isDuplicate: !!c.isDuplicateOf,
      removed: !!c.removal,
      hasPendingFollowUp: pendingFollowUp.has(c.publicCaseNumber),
      officeStatus: officeByCase.get(c.publicCaseNumber)?.status,
    }];
  });
  const overdue = findOverdueCases(candidates, now);
  for (const o of overdue.slice(0, MAX_FOLLOW_UPS_PER_RUN)) {
    if (outOfTime()) {
      report.skippedForTime += 1;
      continue;
    }
    const c = cases.find((x) => x.publicCaseNumber === o.caseNumber)!;
    const office = getReferralOffice(states.get(o.caseNumber)!.officeId!)!;
    const outcome = await runFollowUpAgent(client, c, await getCommunity(c.communityId), office, o, await residentCount(c), now);
    await audit(
      c,
      c.communityId,
      "agent",
      "Follow-up Agent",
      "follow_up_flagged",
      `Run by ${actor}. No progress for ${o.daysWithoutProgress} days (limit ${o.thresholdDays} for ${o.priority}). Drafted a reminder and a public update${outcome.payload.escalateTo ? `; suggests escalating to ${outcome.payload.escalateTo}` : ""}.${outcome.failureNote ? ` ${outcome.failureNote}` : ""}`,
    );
    await proposeWithCritique(client, { kind: "follow_up", caseNumber: c.publicCaseNumber, communityId: c.communityId, payload: outcome.payload, failureNote: outcome.failureNote }, c, now);
    report.flagged.push(c.publicCaseNumber);
  }
  if (overdue.length > MAX_FOLLOW_UPS_PER_RUN) report.notes.push(`${overdue.length - MAX_FOLLOW_UPS_PER_RUN} more overdue cases wait for the next run.`);

  // Weekly summary: once per community per week (never in an example-only run).
  const weekStart = weekStartOf(now);
  const communityIds = options.onlyExamples ? [] : [...new Set(cases.map((c) => c.communityId))];
  for (const communityId of communityIds) {
    if (outOfTime()) break;
    const already = proposals.some((p) => p.kind === "weekly_summary" && p.communityId === communityId && p.payload.weekStart === weekStart);
    if (already) continue;
    const community = await getCommunity(communityId);
    const stats = computeWeeklyStats(await listCasesForCommunity(communityId), now);
    const highlight = await runSummaryHighlight(client, community, stats);
    await audit(null, communityId, "agent", "Summary Agent", "summary_drafted", `Drafted the weekly summary for the week of ${weekStart}: ${stats.newCases} new, ${stats.resolvedCases} resolved, ${stats.openCases} open.${highlight.failureNote ? ` ${highlight.failureNote}` : ""}`);
    await proposeWithCritique(
      client,
      { kind: "weekly_summary", communityId, payload: { ...stats, ...(highlight.highlight ? { highlight: highlight.highlight } : {}), source: highlight.highlight ? "ai" : "rules" }, failureNote: highlight.failureNote },
      undefined,
      now,
    );
    report.summaries.push(communityId);
  }
  // Catch-up: open cases that never got a routing suggestion (e.g. submitted before the pipeline
  // existed). Only a private, pending proposal — nothing public changes.
  const unrouted = cases.filter((c) => !hasRouting.has(c.publicCaseNumber) && !states.get(c.publicCaseNumber)?.officeId && !c.isDuplicateOf && !["closed", "not_verifiable"].includes(c.status));
  for (const c of unrouted.slice(0, MAX_CATCH_UP_ROUTING)) {
    if (outOfTime()) break;
    await repo().upsertState(c.publicCaseNumber, c.communityId, { lastProgressAt: lastProgress(c, states.get(c.publicCaseNumber)) });
    await runRouting(c.publicCaseNumber, now);
    report.routedCatchUp.push(c.publicCaseNumber);
  }
  if (unrouted.length > MAX_CATCH_UP_ROUTING) report.notes.push(`${unrouted.length - MAX_CATCH_UP_ROUTING} more unrouted cases wait for the next run.`);

  if (report.skippedForTime) report.notes.push(`${report.skippedForTime} overdue cases were left for the next run (time limit).`);
  return report;
}

export async function approveFollowUp(
  proposalId: string,
  moderator: string,
  choices: { reminder: boolean; publicUpdate: boolean; escalate: boolean },
  now = new Date(),
): Promise<PipelineResult> {
  const proposal = await repo().getProposal(proposalId);
  if (!proposal || proposal.kind !== "follow_up" || proposal.status !== "pending" || !proposal.caseNumber) {
    return { ok: false, reason: "This follow-up is no longer pending." };
  }
  const c = await getCaseByCaseNumber(proposal.caseNumber);
  const state = await repo().getState(proposal.caseNumber);
  const office = state?.officeId ? getReferralOffice(state.officeId) : undefined;
  if (!c || c.removal || !office) return { ok: false, reason: "The case is gone, removed, or not routed." };
  const p = proposal.payload;
  if (choices.reminder) {
    const check = checkOutgoingMessage(p.reminderEs, c.publicCaseNumber, publicCaseUrl(c.publicCaseNumber));
    if (!check.ok) return { ok: false, reason: `Reminder: ${check.reason}` };
  }
  if (choices.publicUpdate && LANGUAGE_CODES.some((l) => containsPersonalInfo(p.publicUpdate[l]))) {
    return { ok: false, reason: "The public update contains personal information." };
  }
  const reviewed = await repo().reviewProposal(proposal.id, "approved", moderator, undefined, now);
  if (!reviewed) return { ok: false, reason: "This follow-up is no longer pending." };

  const done: string[] = [];
  if (choices.reminder) {
    await addToOutbox(c, office, "follow_up", p.reminderEs, moderator, undefined, now);
    done.push("reminder added to the outbox (not sent)");
  }
  if (choices.publicUpdate) {
    await addTimelineEvent(c.publicCaseNumber, { kind: "follow_up_update", actorType: "moderator", ...asTimelineNote(p.publicUpdate) }, () => now);
    // A resident's case shows status changes only (public-timeline.ts).
    done.push(c.sourceType === "demonstration" ? "public update published" : "update kept private (a resident's case shows only status changes)");
  }
  if (choices.escalate && p.escalateTo) {
    await setRouting(c, office.id, p.escalateTo, moderator, now, `Escalated the priority from ${state!.priority} on the Follow-up Agent's suggestion.`);
    done.push(`priority escalated to ${p.escalateTo}`);
  }
  await repo().upsertState(c.publicCaseNumber, c.communityId, { lastFollowUpAt: now.toISOString(), lastProgressAt: now.toISOString() });
  await audit(c, c.communityId, "moderator", moderator, "follow_up_approved", `Approved the follow-up: ${done.join("; ") || "acknowledged, with no actions"}.`);
  return { ok: true, message: done.length ? `Done: ${done.join("; ")}.` : "Acknowledged." };
}

export async function approveWeeklySummary(proposalId: string, moderator: string, now = new Date()): Promise<PipelineResult> {
  const proposal = await repo().getProposal(proposalId);
  if (!proposal || proposal.kind !== "weekly_summary" || proposal.status !== "pending") return { ok: false, reason: "This summary is no longer pending." };
  const reviewed = await repo().reviewProposal(proposalId, "approved", moderator, undefined, now);
  if (!reviewed) return { ok: false, reason: "This summary is no longer pending." };
  await audit(null, proposal.communityId, "moderator", moderator, "summary_published", `Published the weekly summary for the week of ${proposal.payload.weekStart}.`);
  return { ok: true, message: "Published on the community's Activity page." };
}

// ---- Reading the pipeline ------------------------------------------------------------------

/** Where a case is in the pipeline, from its records. */
export function stageOf(state: CasePipelineState | undefined, proposals: Proposal[], outboxCount: number): PipelineStage {
  if (proposals.some((p) => p.kind === "follow_up") || state?.lastFollowUpAt) return "follow_up";
  if (outboxCount > 0 || state?.referralQueuedAt) return "referral_prepared";
  if (proposals.some((p) => p.kind === "referral")) return "reviewed";
  if (state?.officeId) return "routed";
  return "drafted";
}

export async function getCasePipeline(caseNumber: string) {
  const [state, proposals, outbox, auditLog, officeReferrals, officeNotes] = await Promise.all([
    repo().getState(caseNumber),
    repo().listProposals({ caseNumber }),
    repo().listOutbox({ caseNumber }),
    repo().listAudit({ caseNumber }),
    getOfficeRepository().listForCase(caseNumber),
    getOfficeRepository().listNotesForCase(caseNumber),
  ]);
  return { state, proposals, outbox, audit: auditLog, officeReferrals, officeNotes, stage: stageOf(state, proposals, outbox.length) };
}

export async function getPipelineDashboard(now = new Date()) {
  const [cases, states, proposals, outbox, recentAudit, officeReferrals] = await Promise.all([
    listAllCasesForAdmin(),
    repo().listStates(),
    repo().listProposals(),
    repo().listOutbox(),
    repo().listAudit({ limit: 25 }),
    getOfficeRepository().listAll(),
  ]);
  const stateByCase = new Map(states.map((s) => [s.caseNumber, s]));
  const withOfficeReferral = new Set(officeReferrals.map((r) => r.caseNumber));
  const live = cases.filter((c) => !c.removal);
  const rows = live.map((c) => {
    const s = stateByCase.get(c.publicCaseNumber);
    const own = proposals.filter((p) => p.caseNumber === c.publicCaseNumber);
    const stage = stageOf(s, own, outbox.filter((o) => o.caseNumber === c.publicCaseNumber).length);
    const displayStep = displayStepOf(stage, withOfficeReferral.has(c.publicCaseNumber));
    return { caseNumber: c.publicCaseNumber, communityId: c.communityId, status: c.status, isDemo: c.sourceType === "demonstration", isDuplicateOf: c.isDuplicateOf, stage, displayStep, state: s, lastProgressAt: lastProgress(c, s) };
  });
  const overdue = findOverdueCases(
    rows.flatMap((r) =>
      r.state?.priority && r.state.officeId
        ? [{
            caseNumber: r.caseNumber,
            priority: r.state.priority,
            lastProgressAt: r.lastProgressAt,
            status: r.status,
            isDuplicate: !!r.isDuplicateOf,
            removed: false,
            hasPendingFollowUp: false,
          }]
        : [],
    ),
    now,
  );
  // A deleted case (the resident deleted it, or it was deleted for them) leaves its pipeline
  // records in place, so it can be restored — but nothing about it shows on the dashboard.
  const listed = new Set(cases.map((c) => c.publicCaseNumber));
  const isListed = (caseNumber?: string) => caseNumber === undefined || listed.has(caseNumber);
  return {
    rows,
    pending: proposals.filter((p) => p.status === "pending" && isListed(p.caseNumber)),
    publishedSummaries: proposals.filter((p) => p.kind === "weekly_summary" && p.status === "approved"),
    outbox: outbox.filter((o) => isListed(o.caseNumber)),
    overdue,
    recentAudit: recentAudit.filter((a) => isListed(a.caseNumber)),
  };
}

/** The latest weekly summary a moderator published for a community (public-safe: counts and case numbers). */
export async function getPublishedSummary(communityId: string) {
  const published = await repo().listProposals({ kind: "weekly_summary", status: "approved", communityId });
  const latest = published[0];
  return latest?.kind === "weekly_summary" ? { ...latest.payload, publishedAt: latest.reviewedAt ?? latest.createdAt } : null;
}
