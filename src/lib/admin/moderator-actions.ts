"use server";

import { requireOwner } from "./auth";
import { actorIdOf } from "./actor";
import { getModeratorRepository } from "@/lib/moderators/moderator-store";
import type { AddModeratorResult, Moderator, RemoveModeratorResult } from "@/lib/moderators/logic";

/** The owner's moderator list. Everyone else gets an error, not the list. */
export async function adminListModerators(): Promise<Moderator[]> {
  await requireOwner();
  return getModeratorRepository().listModerators();
}

export async function adminAddModerator(input: unknown): Promise<AddModeratorResult> {
  const owner = await requireOwner();
  return getModeratorRepository().addModerator(input, actorIdOf(owner));
}

/** Removing someone signs them out everywhere at once. The owner can't be removed. */
export async function adminRemoveModerator(email: unknown): Promise<RemoveModeratorResult> {
  await requireOwner();
  if (typeof email !== "string") return { ok: false, error: "not_found" };
  return getModeratorRepository().removeModerator(email);
}
