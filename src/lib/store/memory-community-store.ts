import { COMMUNITIES } from "@/data/communities";
import { ContactConfigSchema, SourceConfigSchema, type CommunityConfig } from "@/lib/schema/community";
import {
  NewContactInputSchema,
  NewSourceInputSchema,
  applyInfoOverrides,
  buildCreatedCommunity,
  buildStarterCommunity,
  emptyOverrides,
  entryId,
  findInfoEntry,
  isBuiltInCommunity,
  type CommunityInfoLogEntry,
  type CreateCommunityResult,
  type DeleteCommunityResult,
  type InfoChangeResult,
  type InfoOverrides,
  type StartCommunityResult,
} from "./community-logic";

export * from "./community-logic";

/**
 * The in-memory community store: the built-in configs (src/data/communities) plus any a
 * moderator or visitor created at runtime, and moderators' source/contact changes. Held on
 * `globalThis`, so it survives dev reloads but NOT a restart, a redeploy, or (on Vercel) a
 * different serverless instance — which is why production uses the Postgres store instead
 * (sql-community-store.ts). Tests always use this one. The rules live in community-logic.ts.
 */
type CommunityStoreState = {
  created: CommunityConfig[];
  overrides: Record<string, InfoOverrides>;
  log: CommunityInfoLogEntry[];
};

function getStore(): CommunityStoreState {
  const g = globalThis as typeof globalThis & { __commonGroundCommunityStore__?: Partial<CommunityStoreState> };
  const store = (g.__commonGroundCommunityStore__ ??= {});
  // Filled in field by field so a store created by an older version of this file (dev HMR)
  // still gets the newer fields.
  store.created ??= [];
  store.overrides ??= {};
  store.log ??= [];
  return store as CommunityStoreState;
}

export function listCommunities(): CommunityConfig[] {
  const { created, overrides } = getStore();
  return [...COMMUNITIES, ...created].map((c) => applyInfoOverrides(c, overrides[c.id]));
}

export function getCommunity(id: string): CommunityConfig | undefined {
  return listCommunities().find((c) => c.id === id);
}

export function createCommunity(rawInput: unknown): CreateCommunityResult {
  const result = buildCreatedCommunity(rawInput, listCommunities());
  if (result.ok) getStore().created.push(result.community);
  return result;
}

/**
 * Returns the community for a place, starting one if none exists yet. A place that already has a
 * community (configured or started by someone else) is reused, never duplicated.
 */
export function startCommunityForPlace(rawParts: unknown): StartCommunityResult {
  const store = getStore();
  const starterCount = store.created.filter((c) => c.status === "starter").length;
  const result = buildStarterCommunity(rawParts, listCommunities(), starterCount);
  if (result.ok && result.created) store.created.push(result.community);
  return result;
}

/** A moderator has reviewed a starter community: it becomes a normal pilot community. */
export function adoptStarterCommunity(id: string): boolean {
  const found = getStore().created.find((c) => c.id === id && c.status === "starter");
  if (!found) return false;
  found.status = "pilot";
  return true;
}

/**
 * `hasCases` says whether any (not deleted) case belongs to the community; the caller supplies it
 * from the case store, which this store doesn't depend on.
 */
export function deleteCommunity(
  id: string,
  actorId: string,
  hasCases: (communityId: string) => boolean,
  now = new Date(),
): DeleteCommunityResult {
  if (isBuiltInCommunity(id)) return { ok: false, error: "built_in" };
  const store = getStore();
  const found = store.created.find((c) => c.id === id);
  if (!found) return { ok: false, error: "not_found" };
  if (hasCases(id)) return { ok: false, error: "has_cases" };
  store.created = store.created.filter((c) => c.id !== id);
  delete store.overrides[id];
  logInfoChange(id, "delete_community", found.displayName, actorId, now);
  return { ok: true };
}

function overridesFor(communityId: string): InfoOverrides {
  const store = getStore();
  const o = (store.overrides[communityId] ??= emptyOverrides());
  o.reverified ??= {};
  return o;
}

function logInfoChange(
  communityId: string,
  action: CommunityInfoLogEntry["action"],
  detail: string,
  actorId: string,
  now: Date,
): void {
  getStore().log.push({ id: crypto.randomUUID(), communityId, action, detail, actorId, occurredAt: now.toISOString() });
}

export function addTrustedSource(communityId: string, rawInput: unknown, actorId: string, now = new Date()): InfoChangeResult {
  if (!getCommunity(communityId)) return { ok: false, error: "unknown_community" };
  const parsed = NewSourceInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const source = SourceConfigSchema.parse({ id: entryId(parsed.data.name), ...parsed.data });
  overridesFor(communityId).sources.push(source);
  logInfoChange(communityId, "add_source", source.name, actorId, now);
  return { ok: true };
}

export function addOfficialContact(communityId: string, rawInput: unknown, actorId: string, now = new Date()): InfoChangeResult {
  if (!getCommunity(communityId)) return { ok: false, error: "unknown_community" };
  const parsed = NewContactInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const contact = ContactConfigSchema.parse({ id: entryId(parsed.data.name), ...parsed.data });
  overridesFor(communityId).contacts.push(contact);
  logInfoChange(communityId, "add_contact", contact.name, actorId, now);
  return { ok: true };
}

/** Removes a source or contact, whether built in or added at runtime. */
export function removeCommunityInfoEntry(
  communityId: string,
  kind: "source" | "contact",
  id: string,
  actorId: string,
  now = new Date(),
): InfoChangeResult {
  const community = getCommunity(communityId);
  if (!community) return { ok: false, error: "unknown_community" };
  const entry = findInfoEntry(community, kind, id);
  if (!entry) return { ok: false, error: "not_found" };
  const o = overridesFor(communityId);
  if (kind === "source") o.sources = o.sources.filter((s) => s.id !== id);
  else o.contacts = o.contacts.filter((c) => c.id !== id);
  o.removedIds.push(id);
  logInfoChange(communityId, kind === "source" ? "remove_source" : "remove_contact", entry.name, actorId, now);
  return { ok: true };
}

/**
 * A reviewer re-checked an entry against its source today. Only ever called from an explicit
 * button — nothing marks information current on its own. A contact can only be re-verified if it
 * has a source URL to check against.
 */
export function reverifyCommunityInfoEntry(
  communityId: string,
  kind: "source" | "contact",
  id: string,
  actorId: string,
  now = new Date(),
): InfoChangeResult {
  const community = getCommunity(communityId);
  if (!community) return { ok: false, error: "unknown_community" };
  const entry = findInfoEntry(community, kind, id);
  if (!entry) return { ok: false, error: "not_found" };
  if (kind === "contact" && !("sourceUrl" in entry && entry.sourceUrl)) return { ok: false, error: "invalid" };
  overridesFor(communityId).reverified[id] = now.toISOString().slice(0, 10);
  logInfoChange(communityId, kind === "source" ? "reverify_source" : "reverify_contact", entry.name, actorId, now);
  return { ok: true };
}

/** Newest first. */
export function listCommunityInfoLog(): CommunityInfoLogEntry[] {
  return [...getStore().log].reverse();
}

/** Test-only reset. */
export function __resetCommunityStoreForTests(): void {
  const store = getStore();
  store.created = [];
  store.overrides = {};
  store.log = [];
}
