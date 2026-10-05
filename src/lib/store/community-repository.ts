import type { CommunityConfig } from "@/lib/schema/community";
import type {
  CommunityInfoLogEntry,
  CreateCommunityResult,
  InfoChangeResult,
  StartCommunityResult,
} from "./community-logic";
import type { CommunityRequestSummary } from "./community-request-logic";

type InfoKind = "source" | "contact";

/**
 * Everything the app can do with communities, independent of where they are stored: the
 * in-memory store (tests, and when no database is configured) or Postgres (production).
 * community-repository-contract.test.ts runs the same tests against both. The built-in
 * communities (src/data/communities) are always part of the list; stores only hold what was
 * created or changed at runtime. Reads return copies, as a database would.
 */
export interface CommunityRepository {
  listCommunities(): Promise<CommunityConfig[]>;
  getCommunity(id: string): Promise<CommunityConfig | undefined>;
  createCommunity(rawInput: unknown): Promise<CreateCommunityResult>;
  startCommunityForPlace(rawParts: unknown): Promise<StartCommunityResult>;
  adoptStarterCommunity(id: string): Promise<boolean>;

  addTrustedSource(communityId: string, rawInput: unknown, actorId: string, now?: Date): Promise<InfoChangeResult>;
  addOfficialContact(communityId: string, rawInput: unknown, actorId: string, now?: Date): Promise<InfoChangeResult>;
  removeCommunityInfoEntry(communityId: string, kind: InfoKind, id: string, actorId: string, now?: Date): Promise<InfoChangeResult>;
  reverifyCommunityInfoEntry(communityId: string, kind: InfoKind, id: string, actorId: string, now?: Date): Promise<InfoChangeResult>;
  /** Newest first. */
  listCommunityInfoLog(): Promise<CommunityInfoLogEntry[]>;

  recordCommunityRequest(rawInput: unknown, now?: Date): Promise<boolean>;
  /** Grouped by place, most-requested first. */
  listCommunityRequestSummaries(): Promise<CommunityRequestSummary[]>;
}
