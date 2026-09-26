"use server";

import { requireAdmin } from "@/lib/admin/auth";
import {
  addOfficialContact,
  addTrustedSource,
  adoptStarterCommunity,
  createCommunity,
  listCommunities,
  listCommunityInfoLog,
  removeCommunityInfoEntry,
  reverifyCommunityInfoEntry,
  type CommunityInfoLogEntry,
  type CreateCommunityResult,
  type InfoChangeResult,
} from "@/lib/store/community-store";
import type { CommunityConfig } from "@/lib/schema/community";
import { listCommunityRequestSummaries, type CommunityRequestSummary } from "@/lib/store/community-request-store";

const ACTOR_ID = "admin";

/**
 * Moderator-only. The input is validated inside `createCommunity` (never trusting the form),
 * and only a structured result comes back — no internal error details.
 */
export async function adminCreateCommunity(input: unknown): Promise<CreateCommunityResult> {
  await requireAdmin();
  return createCommunity(input);
}

export async function adminListCommunities(): Promise<CommunityConfig[]> {
  await requireAdmin();
  return listCommunities();
}

/** Same discipline: the store validates every field, the action only checks the id types. */
export async function adminAddTrustedSource(communityId: string, input: unknown): Promise<InfoChangeResult> {
  await requireAdmin();
  if (typeof communityId !== "string") return { ok: false, error: "unknown_community" };
  return addTrustedSource(communityId, input, ACTOR_ID);
}

export async function adminAddOfficialContact(communityId: string, input: unknown): Promise<InfoChangeResult> {
  await requireAdmin();
  if (typeof communityId !== "string") return { ok: false, error: "unknown_community" };
  return addOfficialContact(communityId, input, ACTOR_ID);
}

export async function adminRemoveCommunityInfoEntry(
  communityId: string,
  kind: "source" | "contact",
  id: string,
): Promise<InfoChangeResult> {
  await requireAdmin();
  if (typeof communityId !== "string" || typeof id !== "string" || (kind !== "source" && kind !== "contact")) {
    return { ok: false, error: "invalid" };
  }
  return removeCommunityInfoEntry(communityId, kind, id, ACTOR_ID);
}

/** An explicit "I checked this today" — the only way an entry's check date moves forward. */
export async function adminReverifyCommunityInfoEntry(
  communityId: string,
  kind: "source" | "contact",
  id: string,
): Promise<InfoChangeResult> {
  await requireAdmin();
  if (typeof communityId !== "string" || typeof id !== "string" || (kind !== "source" && kind !== "contact")) {
    return { ok: false, error: "invalid" };
  }
  return reverifyCommunityInfoEntry(communityId, kind, id, ACTOR_ID);
}

/** A moderator reviewed a visitor-started community and takes it on as a normal pilot. */
export async function adminAdoptStarterCommunity(id: string): Promise<boolean> {
  await requireAdmin();
  if (typeof id !== "string") return false;
  return adoptStarterCommunity(id);
}

export async function adminListCommunityRequests(): Promise<CommunityRequestSummary[]> {
  await requireAdmin();
  return listCommunityRequestSummaries();
}

export async function adminListCommunityInfoLog(): Promise<CommunityInfoLogEntry[]> {
  await requireAdmin();
  return listCommunityInfoLog();
}
