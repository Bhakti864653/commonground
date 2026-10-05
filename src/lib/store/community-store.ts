import type { CommunityRepository } from "./community-repository";
import { memoryCommunityRepository } from "./memory-community-repository";
import { __resetCommunityStoreForTests as resetMemoryCommunities } from "./memory-community-store";
import { __resetCommunityRequestsForTests as resetMemoryRequests } from "./memory-community-request-store";

export * from "./community-logic";
export type { CommunityRequest, CommunityRequestSummary } from "./community-request-logic";
export { MAX_STORED_REQUESTS, placeKeyOf } from "./community-request-logic";
export type { CommunityRepository } from "./community-repository";

/**
 * Where communities are stored. Only the in-memory store exists so far; the Postgres one is
 * chosen here when DATABASE_URL is configured (never under tests).
 */
export function getCommunityRepository(): CommunityRepository {
  return memoryCommunityRepository;
}

// The app's community API: the same names as before, now async. Callers import from here.
const repo = () => getCommunityRepository();

export const listCommunities: CommunityRepository["listCommunities"] = () => repo().listCommunities();
export const getCommunity: CommunityRepository["getCommunity"] = (...a) => repo().getCommunity(...a);
export const createCommunity: CommunityRepository["createCommunity"] = (...a) => repo().createCommunity(...a);
export const startCommunityForPlace: CommunityRepository["startCommunityForPlace"] = (...a) =>
  repo().startCommunityForPlace(...a);
export const adoptStarterCommunity: CommunityRepository["adoptStarterCommunity"] = (...a) =>
  repo().adoptStarterCommunity(...a);
export const addTrustedSource: CommunityRepository["addTrustedSource"] = (...a) => repo().addTrustedSource(...a);
export const addOfficialContact: CommunityRepository["addOfficialContact"] = (...a) => repo().addOfficialContact(...a);
export const removeCommunityInfoEntry: CommunityRepository["removeCommunityInfoEntry"] = (...a) =>
  repo().removeCommunityInfoEntry(...a);
export const reverifyCommunityInfoEntry: CommunityRepository["reverifyCommunityInfoEntry"] = (...a) =>
  repo().reverifyCommunityInfoEntry(...a);
export const listCommunityInfoLog: CommunityRepository["listCommunityInfoLog"] = () => repo().listCommunityInfoLog();
export const recordCommunityRequest: CommunityRepository["recordCommunityRequest"] = (...a) =>
  repo().recordCommunityRequest(...a);
export const listCommunityRequestSummaries: CommunityRepository["listCommunityRequestSummaries"] = () =>
  repo().listCommunityRequestSummaries();

/** Test-only: empties the in-memory community and request stores. */
export function __resetCommunityStoresForTests(): void {
  resetMemoryCommunities();
  resetMemoryRequests();
}
