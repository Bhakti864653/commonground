import {
  DEMO_COMMUNITY_ID,
  DEMO_CONSENT_VERSION,
  DEMO_REFERRAL_OFFICE,
  DEMO_REFERRAL_REASONING,
  DEMO_STATUS_CHANGE_NOTE,
  demoAgentSteps,
  demoFinalStatus,
  type DemoCaseSeed,
} from "./demo-seed";
import { CaseSchema, type Case } from "@/lib/schema/report";
import { SANTIAGO_VERAGUAS } from "@/data/communities";
import { DEMO_PIPELINE_RECORDS } from "@/lib/pipeline/store/demo-pipeline-records";
import { asTimelineNote } from "@/lib/pipeline/store/demo-pipeline-data";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One demonstration case exactly as freshly seeded: created `seed.daysAgo` days before `now`, with
 * its status changes, the agent's public steps and the pipeline's public steps at the same
 * offsets db/seed.sql uses. Used to seed the in-memory store and by "Reset demo" (which keeps the
 * case's id, number and token). Only ever called for the fixed DEMO_CASE_SEEDS.
 */
export function buildDemoCase(
  seed: DemoCaseSeed,
  keep: { id: string; publicCaseNumber: string; managementToken: string },
  now: Date,
): Case {
  const created = now.getTime() - seed.daysAgo * DAY_MS;
  const createdAt = new Date(created).toISOString();
  // A change "N days after the report", never later than now (seed.sql clamps the same way).
  const daysAfter = (days: number) => new Date(Math.min(created + days * DAY_MS, now.getTime())).toISOString();
  const minutesLater = (minutes: number) => new Date(created + minutes * 60 * 1000).toISOString();
  const areaLabels = SANTIAGO_VERAGUAS.areas.find((a) => a.id === seed.areaId)?.labels;

  const statusHistory: Case["statusHistory"] = [{ id: crypto.randomUUID(), status: "received", occurredAt: createdAt, actorType: "system" }];
  const moderationActions: Case["moderationActions"] = [];
  if (seed.secondStatus) {
    const changedAt = daysAfter(4);
    // Describes only what CommonGround itself recorded — never an institution's action.
    statusHistory.push({ id: crypto.randomUUID(), status: seed.secondStatus, occurredAt: changedAt, actorType: "moderator", ...DEMO_STATUS_CHANGE_NOTE });
    moderationActions.push({ id: crypto.randomUUID(), actorId: "demo-seed", action: "status_change", occurredAt: changedAt, detail: seed.secondStatus });
  } else if (seed.status !== "received") {
    const changedAt = daysAfter(2);
    statusHistory.push({ id: crypto.randomUUID(), status: seed.status, occurredAt: changedAt, actorType: "moderator" });
    moderationActions.push({ id: crypto.randomUUID(), actorId: "demo-seed", action: "status_change", occurredAt: changedAt, detail: seed.status });
  }

  // The agent's steps (and a moderator's approval), in time order among the status changes.
  for (const step of demoAgentSteps(seed)) {
    statusHistory.push({
      id: crypto.randomUUID(),
      status: step.status,
      occurredAt: minutesLater(step.minutesAfter),
      actorType: step.actorType,
      kind: step.kind,
      contactId: step.contactId,
    });
    if (step.kind === "referral_approved") {
      moderationActions.push({ id: crypto.randomUUID(), actorId: "demo-seed", action: "approve_referral", occurredAt: minutesLater(step.minutesAfter), detail: step.contactId });
    }
  }

  // The agentic pipeline's public steps (demo-pipeline-data.ts): a referral prepared with sending
  // paused, and an approved follow-up update. Each carries the status the case had at that moment.
  const pipeline = DEMO_PIPELINE_RECORDS.find((r) => r.description === seed.description);
  for (const step of pipeline?.publicEvents ?? []) {
    const occurredAt = new Date(created + (seed.daysAgo - step.daysAgo) * DAY_MS).toISOString();
    const statusThen =
      statusHistory
        .filter((e) => (e.kind ?? "status") === "status" && e.occurredAt <= occurredAt)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
        .at(-1)?.status ?? "received";
    statusHistory.push({ id: crypto.randomUUID(), status: statusThen, occurredAt, actorType: "moderator", kind: step.kind, ...(step.notes ? asTimelineNote(step.notes) : {}) });
  }
  statusHistory.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  moderationActions.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  const agentSuggestions: Case["agentSuggestions"] = [];
  const referral = seed.agent?.referral;
  if (referral) {
    const approvedAfter = referral.approvedAfterDays;
    agentSuggestions.push({
      id: crypto.randomUUID(),
      kind: "referral",
      suggestedValue: DEMO_REFERRAL_OFFICE,
      reasoning: DEMO_REFERRAL_REASONING,
      createdAt: minutesLater(4),
      status: approvedAfter === undefined ? "pending" : "approved",
      ...(approvedAfter === undefined ? {} : { reviewedAt: minutesLater(approvedAfter * 24 * 60) }),
      referral: { contactId: DEMO_REFERRAL_OFFICE, urgency: referral.urgency, message: referral.message, categoryAssessment: "confirmed" },
    });
  }

  return CaseSchema.parse({
    id: keep.id,
    type: seed.type,
    publicCaseNumber: keep.publicCaseNumber,
    communityId: DEMO_COMMUNITY_ID,
    categoryId: seed.categoryId,
    description: seed.description,
    approximateArea: {
      kind: "neighborhood",
      areaId: seed.areaId,
      label: seed.areaLabel,
      ...(areaLabels ? { labels: areaLabels } : {}),
      labelEs: seed.areaLabelEs,
    },
    createdAt,
    status: demoFinalStatus(seed),
    statusHistory,
    sourceType: "demonstration",
    verificationState: "demonstration_data",
    consent: { consentVersion: DEMO_CONSENT_VERSION, consentedAt: createdAt, language: "es" },
    adminNotes: [],
    inaccuracyFlags: [],
    moderationActions,
    agentSuggestions,
    managementToken: keep.managementToken,
  });
}
