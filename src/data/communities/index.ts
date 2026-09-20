import type { CommunityConfig } from "@/lib/schema/community";
import { SANTIAGO_VERAGUAS } from "./santiago-veraguas";
import { RIVERBEND_DEMO } from "./riverbend-demo";

export { SANTIAGO_VERAGUAS, RIVERBEND_DEMO };

export const COMMUNITIES: CommunityConfig[] = [SANTIAGO_VERAGUAS, RIVERBEND_DEMO];

export function getCommunityById(id: string): CommunityConfig | undefined {
  return COMMUNITIES.find((c) => c.id === id);
}
