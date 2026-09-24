"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { createCommunity, listCommunities, type CreateCommunityResult } from "@/lib/store/community-store";
import type { CommunityConfig } from "@/lib/schema/community";

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
