import { getReferralOffice } from "@/data/referral-offices";
import { getGroqClient } from "@/lib/guide/groq-client";
import { addTimelineEvent, changeCaseStatus, getCaseByCaseNumber, listOpenCasesForCommunity } from "@/lib/store/case-store";
import { getCommunity } from "@/lib/store/community-store";
import { publicCaseUrl } from "@/lib/site-url";
import type { Case } from "@/lib/schema/report";
import { getPipelineRepository } from "@/lib/pipeline/store";
import { proposeWithCritique, runRouting, type PipelineResult } from "@/lib/pipeline/pipeline";
import { redactPersonalInfo } from "@/lib/pipeline/redact";
import { asTimelineNote } from "@/lib/pipeline/store/demo-pipeline-data";
import type { OutboxItem, Priority } from "@/lib/pipeline/types";
import { getOfficeRepository } from "./store";
import { translateOfficeNote } from "./translate-agent";
import { NEXT_STATUSES, OFFICE_STATUS_LABELS, type OfficeActor, type OfficeReferral, type OfficeReferralView, type OfficeStatus } from "./types";

/**
 * Everything an office can do, for real office accounts and for the simulated demo office alike.
 * Every function takes the acting office and re-checks, for each referral it touches, that:
 *  - the referral belongs to that office (the query itself filters by office id), and
 *  - it is the right kind: example cases for the demo office, real cases for a real office —
 *    checked on the referral AND on the case itself.
 * Offices only ever receive OfficeReferralView (an allow-list of public-safe fields).
 * Nothing here sends anything outside CommonGround.
 */

const repo = () => getOfficeRepository();
const pipeline = () => getPipelineRepository();
const DAY_MS = 86_400_000;
const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function officeName(officeId: string) {
  return getReferralOffice(officeId)?.name ?? officeId;
}

function actorLabel(actor: OfficeActor) {
  return actor.demo ? `Simulated ${officeName(actor.officeId)} (demo, by ${actor.actor})` : `${actor.actor} (${officeName(actor.officeId)})`;
}

/** The referral and its case, only if this office may act on them. */
async function loadForActor(actor: OfficeActor, referralId: string): Promise<{ referral: OfficeReferral; c: Case } | null> {
  if (typeof referralId !== "string" || !getReferralOffice(actor.officeId)) return null;
  const referral = await repo().getForOffice(referralId, actor.officeId, actor.demo);
  if (!referral) return null;
  const c = await getCaseByCaseNumber(referral.caseNumber);
  if (!c || c.removal) return null;
  // Belt and braces: the case itself must match the portal it's used from.
  const isExample = c.sourceType === "demonstration";
  if (isExample !== actor.demo) return null;
  return { referral, c };
}

async function toView(referral: OfficeReferral, c: Case, now: Date): Promise<OfficeReferralView> {
  const community = await getCommunity(c.communityId);
  const category = community?.categories.find((x) => x.id === c.categoryId);
  const state = await pipeline().getState(c.publicCaseNumber);
  const others = await listOpenCasesForCommunity(c.communityId);
  const notes = await repo().listNotesForReferral(referral.id, referral.officeId);
  return {
    id: referral.id,
    caseNumber: c.publicCaseNumber,
    category: category?.label ?? c.categoryId,
    categoryEs: category?.labelEs ?? c.categoryId,
    zone: c.approximateArea.kind === "prefer_not_to_say" ? "Not given" : c.approximateArea.label,
    description: redactPersonalInfo(c.description).text,
    priority: state?.priority ?? null,
    daysOpen: Math.max(0, Math.floor((now.getTime() - Date.parse(c.createdAt)) / DAY_MS)),
    residentCount: 1 + others.filter((o) => o.isDuplicateOf === c.publicCaseNumber).length,
    publicUrl: publicCaseUrl(c.publicCaseNumber),
    status: referral.status,
    declineReason: referral.declineReason ?? null,
    receivedAt: referral.createdAt,
    statusChangedAt: referral.statusChangedAt,
    notes: notes.map((n) => ({ kind: n.kind, text: n.text, createdAt: n.createdAt })),
  };
}

/** The office's inbox: its own referrals, most urgent first, then newest. */
export async function listInbox(actor: OfficeActor, now = new Date()): Promise<OfficeReferralView[]> {
  if (!getReferralOffice(actor.officeId)) return [];
  const views: OfficeReferralView[] = [];
  for (const referral of await repo().listForOffice(actor.officeId, actor.demo)) {
    const c = await getCaseByCaseNumber(referral.caseNumber);
    if (!c || c.removal || (c.sourceType === "demonstration") !== actor.demo) continue;
    views.push(await toView(referral, c, now));
  }
  return views.sort(
    (a, b) =>
      (a.priority ? PRIORITY_RANK[a.priority] : 9) - (b.priority ? PRIORITY_RANK[b.priority] : 9) || b.receivedAt.localeCompare(a.receivedAt),
  );
}

/** Received → In progress → Resolved, or "Not our department" (with a reason). */
export async function changeOfficeStatus(
  actor: OfficeActor,
  referralId: string,
  status: OfficeStatus,
  reason?: string,
  now = new Date(),
): Promise<PipelineResult> {
  const loaded = await loadForActor(actor, referralId);
  if (!loaded) return { ok: false, reason: "This referral isn't in your inbox." };
  const { referral, c } = loaded;
  if (!NEXT_STATUSES[referral.status].includes(status)) {
    return { ok: false, reason: `A referral that is "${OFFICE_STATUS_LABELS[referral.status]}" can't become "${OFFICE_STATUS_LABELS[status]}".` };
  }
  const cleanReason = reason?.trim() ? redactPersonalInfo(reason.trim().slice(0, 500)).text : undefined;
  if (status === "not_our_department" && (!cleanReason || cleanReason.length < 5)) {
    return { ok: false, reason: "Please say briefly why this isn't your department (it helps moderators re-route it)." };
  }

  const updated = await repo().setStatus(referral.id, actor.officeId, status, status === "not_our_department" ? cleanReason : undefined, now);
  if (!updated) return { ok: false, reason: "This referral isn't in your inbox." };
  const clock = () => now;
  const who = actorLabel(actor);
  const audit = (action: string, summary: string) =>
    pipeline().addAudit({ caseNumber: c.publicCaseNumber, communityId: c.communityId, actorType: "office", actor: who, action, summary }, now);

  switch (status) {
    case "received":
      await addTimelineEvent(c.publicCaseNumber, { kind: "office_received", actorType: "office" }, clock);
      await audit("office_received", "Marked the referral as received.");
      break;
    case "in_progress":
      await addTimelineEvent(c.publicCaseNumber, { kind: "office_in_progress", actorType: "office", setStatus: "in_progress" }, clock);
      await audit("office_in_progress", "Marked the referral as in progress (the case is now In progress).");
      break;
    case "resolved":
      await addTimelineEvent(c.publicCaseNumber, { kind: "office_resolved", actorType: "office" }, clock);
      await pipeline().addProposal(
        { kind: "office_resolution", caseNumber: c.publicCaseNumber, communityId: c.communityId, payload: { referralId: referral.id, officeId: actor.officeId, source: "office" } },
        now,
      );
      await audit("office_resolved", "Reported the problem resolved. A moderator must confirm before the case closes.");
      break;
    case "not_our_department": {
      await addTimelineEvent(c.publicCaseNumber, { kind: "office_declined", actorType: "office" }, clock);
      await audit("office_declined", `Said this is not their department: "${cleanReason}". Sent back to moderators for re-routing.`);
      // Back to routing: the office is cleared and the Routing Agent proposes another (excluding
      // every office that already declined). A moderator approves the new route as usual.
      await pipeline().upsertState(c.publicCaseNumber, c.communityId, { officeId: undefined, routedAt: undefined, lastProgressAt: now.toISOString() });
      const declined = (await repo().listForCase(c.publicCaseNumber)).filter((r) => r.status === "not_our_department");
      await runRouting(c.publicCaseNumber, now, declined.map((r) => ({ officeId: r.officeId, reason: r.declineReason ?? "" })));
      break;
    }
  }
  if (status !== "not_our_department") await pipeline().upsertState(c.publicCaseNumber, c.communityId, { lastProgressAt: now.toISOString() });
  return { ok: true, message: status === "resolved" ? "Marked resolved. A CommonGround moderator will confirm before the case closes." : `Marked "${OFFICE_STATUS_LABELS[status]}".` };
}

/**
 * A note from the office. Private: moderators only, right away. Public: personal details removed,
 * translated into the seven languages by the AI, checked by the Critic, and published only when
 * a moderator approves it.
 */
export async function addOfficeNote(actor: OfficeActor, referralId: string, kind: "public" | "private", text: string, now = new Date()): Promise<PipelineResult> {
  const loaded = await loadForActor(actor, referralId);
  if (!loaded) return { ok: false, reason: "This referral isn't in your inbox." };
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed || trimmed.length > 1000) return { ok: false, reason: "Write a note of up to 1000 characters." };
  const { referral, c } = loaded;
  const clean = kind === "public" ? redactPersonalInfo(trimmed).text : trimmed;
  await repo().addNote({ referralId: referral.id, caseNumber: c.publicCaseNumber, officeId: actor.officeId, kind, text: clean, author: actorLabel(actor) }, now);
  await pipeline().addAudit(
    { caseNumber: c.publicCaseNumber, communityId: c.communityId, actorType: "office", actor: actorLabel(actor), action: `office_${kind}_note`, summary: kind === "private" ? `Private note for moderators: "${clean.slice(0, 300)}"` : "Wrote a public note; it waits for a moderator to approve it." },
    now,
  );
  if (kind === "private") return { ok: true, message: "Private note saved. Only CommonGround moderators can see it." };

  const client = getGroqClient();
  const translated = await translateOfficeNote(client, clean);
  await proposeWithCritique(
    client,
    {
      kind: "office_note",
      caseNumber: c.publicCaseNumber,
      communityId: c.communityId,
      payload: { referralId: referral.id, officeId: actor.officeId, original: clean, translations: translated.translations, source: translated.source },
      failureNote: translated.failureNote,
    },
    c,
    now,
  );
  return { ok: true, message: "Public note sent to CommonGround moderators. It appears on the case page once they approve it." };
}

// ---- Moderator decisions on what offices sent ---------------------------------------------

export async function approveOfficeNote(proposalId: string, moderator: string, now = new Date()): Promise<PipelineResult> {
  const p = await pipeline().getProposal(proposalId);
  if (!p || p.kind !== "office_note" || p.status !== "pending" || !p.caseNumber) return { ok: false, reason: "This note is no longer pending." };
  if (!(await pipeline().reviewProposal(p.id, "approved", moderator, undefined, now))) return { ok: false, reason: "This note is no longer pending." };
  await addTimelineEvent(p.caseNumber, { kind: "office_note", actorType: "office", ...asTimelineNote(p.payload.translations) }, () => now);
  await pipeline().addAudit({ caseNumber: p.caseNumber, communityId: p.communityId, actorType: "moderator", actor: moderator, action: "office_note_published", summary: "Approved the office's public note (7 languages) and published it on the case page." }, now);
  const c = await getCaseByCaseNumber(p.caseNumber);
  return { ok: true, message: c?.sourceType === "demonstration" ? "Published on the case page." : "Approved. This is a resident's case, so it stays private (their page shows only status changes)." };
}

/** Confirm: the case closes (the same status change the manual Status control makes). */
export async function confirmOfficeResolution(proposalId: string, moderator: string, now = new Date()): Promise<PipelineResult> {
  const p = await pipeline().getProposal(proposalId);
  if (!p || p.kind !== "office_resolution" || p.status !== "pending" || !p.caseNumber) return { ok: false, reason: "This is no longer pending." };
  if (!(await pipeline().reviewProposal(p.id, "approved", moderator, undefined, now))) return { ok: false, reason: "This is no longer pending." };
  await changeCaseStatus(p.caseNumber, "closed", moderator, "The responsible office reported it resolved, and a moderator confirmed.", () => now);
  await pipeline().addAudit({ caseNumber: p.caseNumber, communityId: p.communityId, actorType: "moderator", actor: moderator, action: "office_resolution_confirmed", summary: `Confirmed ${officeName(p.payload.officeId)}'s resolution. The case is closed.` }, now);
  return { ok: true, message: "Confirmed. The case is closed." };
}

/** Not yet: the referral goes back to "In progress" for the office. */
export async function rejectOfficeResolution(proposalId: string, moderator: string, now = new Date()): Promise<PipelineResult> {
  const p = await pipeline().getProposal(proposalId);
  if (!p || p.kind !== "office_resolution" || p.status !== "pending" || !p.caseNumber) return { ok: false, reason: "This is no longer pending." };
  if (!(await pipeline().reviewProposal(p.id, "rejected", moderator, undefined, now))) return { ok: false, reason: "This is no longer pending." };
  await repo().setStatus(p.payload.referralId, p.payload.officeId, "in_progress", undefined, now);
  await pipeline().addAudit({ caseNumber: p.caseNumber, communityId: p.communityId, actorType: "moderator", actor: moderator, action: "office_resolution_rejected", summary: `Didn't confirm the resolution yet; the referral is back to "In progress" for ${officeName(p.payload.officeId)}.` }, now);
  return { ok: true, message: "Sent back to the office as In progress." };
}

/** When a moderator approves a referral into the outbox, it also arrives in the office's inbox. */
export async function deliverToOfficeInbox(c: Case, item: OutboxItem, now = new Date()): Promise<OfficeReferral> {
  return repo().createReferral({ caseNumber: c.publicCaseNumber, communityId: c.communityId, officeId: item.officeId, isDemo: c.sourceType === "demonstration", outboxId: item.id }, now);
}
