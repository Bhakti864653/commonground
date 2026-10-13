"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { actorIdOf } from "@/lib/admin/actor";
import { getCaseByCaseNumber } from "@/lib/store/case-store";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";
import { REFERRAL_OFFICE_IDS } from "@/data/referral-offices";
import {
  approveFollowUp,
  approveReferral,
  approveRouting,
  approveWeeklySummary,
  draftReferral,
  getCasePipeline,
  getPipelineDashboard,
  mergeDuplicate,
  rejectProposal,
  runFollowUp,
  runRouting,
  setRouting,
  type FollowUpRunReport,
  type PipelineResult,
} from "./pipeline";
import { PrioritySchema } from "./types";
import { resetDemo } from "./demo-reset";
import { approveOfficeNote, confirmOfficeResolution, rejectOfficeResolution } from "@/lib/office/service";

/**
 * Moderator-only entry points to the pipeline. Every one checks the session first and validates
 * its arguments at runtime (a server action can be called directly with anything), and records
 * the decision under the moderator's own name.
 */

const Id = z.string().min(1).max(100);
const CaseNumber = z.string().min(1).max(40);
const invalid: PipelineResult = { ok: false, reason: "Invalid request." };

export async function getCasePipelineForAdmin(caseNumber: string) {
  await requireAdmin();
  if (!CaseNumber.safeParse(caseNumber).success) return null;
  return getCasePipeline(caseNumber);
}

export async function getPipelineDashboardForAdmin() {
  await requireAdmin();
  return getPipelineDashboard();
}

export async function rerunRoutingAction(caseNumber: unknown): Promise<PipelineResult> {
  await requireAdmin();
  const n = CaseNumber.safeParse(caseNumber);
  return n.success ? runRouting(n.data) : invalid;
}

export async function approveRoutingAction(proposalId: unknown, change: unknown): Promise<PipelineResult> {
  const actor = actorIdOf(await requireAdmin());
  const id = Id.safeParse(proposalId);
  const parsed = z
    .object({
      officeId: z.enum(REFERRAL_OFFICE_IDS).optional(),
      priority: PrioritySchema.optional(),
      moderatorLanguage: z.enum(LANGUAGE_CODES).optional(),
    })
    .safeParse(change ?? {});
  if (!id.success || !parsed.success) return invalid;
  return approveRouting(id.data, actor, parsed.data);
}

export async function rejectProposalAction(proposalId: unknown): Promise<PipelineResult> {
  const actor = actorIdOf(await requireAdmin());
  const id = Id.safeParse(proposalId);
  return id.success ? rejectProposal(id.data, actor) : invalid;
}

export async function mergeDuplicateAction(caseNumber: unknown, intoCaseNumber: unknown): Promise<PipelineResult> {
  const actor = actorIdOf(await requireAdmin());
  const a = CaseNumber.safeParse(caseNumber);
  const b = CaseNumber.safeParse(intoCaseNumber);
  return a.success && b.success ? mergeDuplicate(a.data, b.data, actor) : invalid;
}

/** The manual path: a moderator sets the office and priority directly, no agent involved. */
export async function setRoutingAction(caseNumber: unknown, officeId: unknown, priority: unknown): Promise<PipelineResult> {
  const actor = actorIdOf(await requireAdmin());
  const n = CaseNumber.safeParse(caseNumber);
  const o = z.enum(REFERRAL_OFFICE_IDS).safeParse(officeId);
  const p = PrioritySchema.safeParse(priority);
  if (!n.success || !o.success || !p.success) return invalid;
  const c = await getCaseByCaseNumber(n.data);
  if (!c) return { ok: false, reason: "Case not found." };
  await setRouting(c, o.data, p.data, actor, new Date(), "Set the office and priority by hand.");
  return { ok: true, message: "Saved." };
}

export async function draftReferralAction(caseNumber: unknown, moderatorLanguage: unknown): Promise<PipelineResult> {
  await requireAdmin();
  const n = CaseNumber.safeParse(caseNumber);
  const l = z.enum(LANGUAGE_CODES).safeParse(moderatorLanguage ?? "en");
  return n.success && l.success ? draftReferral(n.data, l.data) : invalid;
}

export async function approveReferralAction(proposalId: unknown, messageEs: unknown): Promise<PipelineResult> {
  const actor = actorIdOf(await requireAdmin());
  const id = Id.safeParse(proposalId);
  const m = z.string().max(4000).optional().safeParse(messageEs ?? undefined);
  return id.success && m.success ? approveReferral(id.data, actor, { messageEs: m.data }) : invalid;
}

export async function approveFollowUpAction(proposalId: unknown, choices: unknown): Promise<PipelineResult> {
  const actor = actorIdOf(await requireAdmin());
  const id = Id.safeParse(proposalId);
  const c = z.object({ reminder: z.boolean(), publicUpdate: z.boolean(), escalate: z.boolean() }).safeParse(choices);
  return id.success && c.success ? approveFollowUp(id.data, actor, c.data) : invalid;
}

export async function approveWeeklySummaryAction(proposalId: unknown): Promise<PipelineResult> {
  const actor = actorIdOf(await requireAdmin());
  const id = Id.safeParse(proposalId);
  return id.success ? approveWeeklySummary(id.data, actor) : invalid;
}

/** "Run follow-up now": the same run the daily cron does, started by a moderator for a demo. */
export async function runFollowUpNowAction(): Promise<FollowUpRunReport> {
  await requireAdmin();
  return runFollowUp("manual");
}

/** The same run, limited to the example cases (the demo guide uses it, so no resident case is touched). */
export async function runDemoFollowUpNowAction(): Promise<FollowUpRunReport> {
  await requireAdmin();
  return runFollowUp("manual", new Date(), { onlyExamples: true });
}

/**
 * "Reset demo": puts only the eight example cases back to their starting state, so the demo can
 * be shown again. Resident cases are never touched (demo-reset.test.ts proves it).
 */
export async function resetDemoAction(): Promise<PipelineResult> {
  const actor = actorIdOf(await requireAdmin());
  const { reset } = await resetDemo(actor);
  return reset.length
    ? { ok: true, message: `Reset ${reset.length} example cases (${reset.join(", ")}). Resident cases were not touched.` }
    : { ok: false, reason: "No example cases were found." };
}

// ---- What offices sent (moderator decisions) -----------------------------------------------

export async function approveOfficeNoteAction(proposalId: unknown): Promise<PipelineResult> {
  const actor = actorIdOf(await requireAdmin());
  const id = Id.safeParse(proposalId);
  return id.success ? approveOfficeNote(id.data, actor) : invalid;
}

export async function confirmOfficeResolutionAction(proposalId: unknown): Promise<PipelineResult> {
  const actor = actorIdOf(await requireAdmin());
  const id = Id.safeParse(proposalId);
  return id.success ? confirmOfficeResolution(id.data, actor) : invalid;
}

export async function rejectOfficeResolutionAction(proposalId: unknown): Promise<PipelineResult> {
  const actor = actorIdOf(await requireAdmin());
  const id = Id.safeParse(proposalId);
  return id.success ? rejectOfficeResolution(id.data, actor) : invalid;
}
