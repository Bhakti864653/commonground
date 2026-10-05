import type { CommunityConfig, OfficialContact } from "@/lib/schema/community";

export type TimelineOfficeName = Pick<OfficialContact, "id" | "name" | "nameEs" | "labels">;

/**
 * Names only (already public on /resources), for naming the office in public timeline entries:
 * the routing's short public name when it has one, else the contact's own name.
 */
export function timelineOfficeNames(community: CommunityConfig): TimelineOfficeName[] {
  return community.officialContacts.map(({ id, name, nameEs, labels }) => {
    const publicName = community.referralRouting?.find((r) => r.contactId === id && r.publicName)?.publicName;
    return publicName
      ? { id, name: publicName.label, nameEs: publicName.labelEs, labels: publicName.labels }
      : { id, name, nameEs, labels };
  });
}

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
