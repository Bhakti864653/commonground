import type { CommunityRepository } from "./community-repository";
import * as communities from "./memory-community-store";
import * as requests from "./memory-community-request-store";
import { listAllCasesForAdmin } from "./memory-case-store";

/** Copies, so a caller changing a returned community can't change the stored one. */
const copy = <T>(value: T): T => structuredClone(value);

/** The in-memory community and request stores behind the shared CommunityRepository interface. */
export const memoryCommunityRepository: CommunityRepository = {
  listCommunities: async () => copy(communities.listCommunities()),
  getCommunity: async (id) => copy(communities.getCommunity(id)),
  createCommunity: async (raw) => copy(communities.createCommunity(raw)),
  startCommunityForPlace: async (raw) => copy(communities.startCommunityForPlace(raw)),
  adoptStarterCommunity: async (id) => communities.adoptStarterCommunity(id),
  deleteCommunity: async (id, actorId, now) =>
    communities.deleteCommunity(id, actorId, (communityId) => listAllCasesForAdmin().some((c) => c.communityId === communityId), now),
  addTrustedSource: async (...args) => communities.addTrustedSource(...args),
  addOfficialContact: async (...args) => communities.addOfficialContact(...args),
  removeCommunityInfoEntry: async (...args) => communities.removeCommunityInfoEntry(...args),
  reverifyCommunityInfoEntry: async (...args) => communities.reverifyCommunityInfoEntry(...args),
  listCommunityInfoLog: async () => copy(communities.listCommunityInfoLog()),
  recordCommunityRequest: async (...args) => requests.recordCommunityRequest(...args),
  listCommunityRequestSummaries: async () => copy(requests.listCommunityRequestSummaries()),
};
