"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { requireAdmin, requireOwner } from "@/lib/admin/auth";
import { actorIdOf } from "@/lib/admin/actor";
import { getReferralOffice, REFERRAL_OFFICE_IDS } from "@/data/referral-offices";
import { hashSessionToken, normalizeEmail } from "@/lib/moderators/logic";
import type { PipelineResult } from "@/lib/pipeline/pipeline";
import { getOfficeRepository } from "./store";
import { OFFICE_SESSION_COOKIE, requireOffice } from "./auth";
import { addOfficeNote, changeOfficeStatus, listInbox } from "./service";
import { OfficeStatusSchema, type OfficeAccount, type OfficeActor, type OfficeReferralView } from "./types";

/**
 * Office portal entry points. Two families, never mixed:
 *  - office…  : a real office account. Requires OFFICE_PORTAL_ENABLED and an office session;
 *               only that office's real (non-example) referrals.
 *  - demoOffice… : a signed-in moderator acting as a SIMULATED example office; only example cases.
 * Every argument is validated at runtime (a server action can be called with anything).
 */

const Id = z.string().min(1).max(100);
const Note = z.object({ kind: z.enum(["public", "private"]), text: z.string().min(1).max(1000) });
const invalid: PipelineResult = { ok: false, reason: "Invalid request." };

async function demoActor(officeId: unknown): Promise<OfficeActor | null> {
  const moderator = actorIdOf(await requireAdmin());
  const id = z.enum(REFERRAL_OFFICE_IDS).safeParse(officeId);
  return id.success ? { officeId: id.data, actor: moderator, demo: true } : null;
}

// ---- Real office accounts (switched off) ----------------------------------------------------

export async function officeInboxAction(): Promise<OfficeReferralView[]> {
  return listInbox(await requireOffice());
}

export async function officeChangeStatusAction(referralId: unknown, status: unknown, reason?: unknown): Promise<PipelineResult> {
  const actor = await requireOffice();
  const id = Id.safeParse(referralId);
  const s = OfficeStatusSchema.safeParse(status);
  const r = z.string().max(500).optional().safeParse(reason ?? undefined);
  return id.success && s.success && r.success ? changeOfficeStatus(actor, id.data, s.data, r.data) : invalid;
}

export async function officeAddNoteAction(referralId: unknown, note: unknown): Promise<PipelineResult> {
  const actor = await requireOffice();
  const id = Id.safeParse(referralId);
  const n = Note.safeParse(note);
  return id.success && n.success ? addOfficeNote(actor, id.data, n.data.kind, n.data.text) : invalid;
}

export async function officeSignOutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(OFFICE_SESSION_COOKIE)?.value;
  if (token) await getOfficeRepository().deleteSession(hashSessionToken(token));
  jar.delete(OFFICE_SESSION_COOKIE);
}

// ---- The simulated demo office (moderators only, example cases only) -------------------------

export async function demoOfficeInboxAction(officeId: unknown): Promise<OfficeReferralView[]> {
  const actor = await demoActor(officeId);
  return actor ? listInbox(actor) : [];
}

export async function demoOfficeChangeStatusAction(officeId: unknown, referralId: unknown, status: unknown, reason?: unknown): Promise<PipelineResult> {
  const actor = await demoActor(officeId);
  const id = Id.safeParse(referralId);
  const s = OfficeStatusSchema.safeParse(status);
  const r = z.string().max(500).optional().safeParse(reason ?? undefined);
  return actor && id.success && s.success && r.success ? changeOfficeStatus(actor, id.data, s.data, r.data) : invalid;
}

export async function demoOfficeAddNoteAction(officeId: unknown, referralId: unknown, note: unknown): Promise<PipelineResult> {
  const actor = await demoActor(officeId);
  const id = Id.safeParse(referralId);
  const n = Note.safeParse(note);
  return actor && id.success && n.success ? addOfficeNote(actor, id.data, n.data.kind, n.data.text) : invalid;
}

// ---- Office accounts: invite-only, owner only ------------------------------------------------

export async function listOfficeAccountsAction(): Promise<OfficeAccount[]> {
  await requireOwner();
  return getOfficeRepository().listAccounts();
}

export async function inviteOfficeAccountAction(input: unknown): Promise<PipelineResult> {
  const owner = await requireOwner();
  const parsed = z.object({ email: z.string().email().max(200), officeId: z.enum(REFERRAL_OFFICE_IDS), name: z.string().max(120).default("") }).safeParse(input);
  if (!parsed.success) return { ok: false, reason: "Give a valid email and pick an office." };
  const added = await getOfficeRepository().addAccount({ email: normalizeEmail(parsed.data.email), officeId: parsed.data.officeId, name: parsed.data.name.trim(), invitedBy: owner.email ?? "owner" });
  return added
    ? { ok: true, message: `Invited ${added.email} for ${getReferralOffice(added.officeId)?.name}. They can sign in only once the office portal is turned on.` }
    : { ok: false, reason: "That email already has an office account." };
}

export async function disableOfficeAccountAction(email: unknown): Promise<PipelineResult> {
  await requireOwner();
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return invalid;
  return (await getOfficeRepository().disableAccount(parsed.data)) ? { ok: true, message: "Disabled. Their sessions ended." } : { ok: false, reason: "No active account with that email." };
}
