import type { CommunityConfig, OfficialContact } from "@/lib/schema/community";

/**
 * Picks the office a case's referral goes to — no model involved. The AI only explains the
 * choice afterwards; it never chooses. Re-checks at use time what the config schema checks at
 * load time, because a moderator can edit or remove contacts at runtime (/admin/sources): a route
 * whose contact is gone, unverified, or an emergency line yields no referral at all rather than
 * a guess.
 */
export function routeReferral(community: CommunityConfig, categoryId: string): OfficialContact | null {
  const route = community.referralRouting?.find((r) => r.categoryId === categoryId);
  if (!route) return null;
  const contact = community.officialContacts.find((c) => c.id === route.contactId);
  if (!contact || !contact.verified || contact.isEmergencyService) return null;
  return contact;
}
