import { COMMUNITIES } from "@/data/communities";
import { casePrefix } from "@/lib/case-number/format-case-number";
import {
  CommunityConfigSchema,
  ContactConfigSchema,
  SourceConfigSchema,
  type CommunityConfig,
} from "@/lib/schema/community";
import type { SqlClient } from "@/lib/db/sql-client";
import type { CommunityRepository } from "./community-repository";
import {
  NewContactInputSchema,
  NewSourceInputSchema,
  applyInfoOverrides,
  buildCreatedCommunity,
  buildStarterCommunity,
  communityNameKey,
  emptyOverrides,
  entryId,
  findInfoEntry,
  isBuiltInCommunity,
  type CommunityInfoLogEntry,
  type InfoChangeResult,
  type InfoOverrides,
} from "./community-logic";
import {
  MAX_STORED_REQUESTS,
  buildCommunityRequest,
  summarizeCommunityRequests,
  type CommunityRequest,
} from "./community-request-logic";

/**
 * The Postgres implementation of CommunityRepository (tables: db/migrations/0002_communities.sql).
 * Built-in communities stay in code; the database holds what was created or changed at runtime.
 * All the rules come from community-logic.ts / community-request-logic.ts, the same ones the
 * in-memory store uses, and community-repository-contract.test.ts runs the same tests on both.
 */

type Row = Record<string, unknown>;

const json = (value: unknown) => JSON.stringify(value);
const iso = (value: unknown) => (value instanceof Date ? value : new Date(String(value))).toISOString();
const isUniqueViolation = (error: unknown, constraint?: string) =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: string }).code === "23505" &&
  (!constraint || (error as { constraint?: string }).constraint === constraint);

function toOverrides(row: Row | undefined): InfoOverrides | undefined {
  if (!row) return undefined;
  return {
    sources: row.sources as InfoOverrides["sources"],
    contacts: row.contacts as InfoOverrides["contacts"],
    removedIds: row.removed_ids as string[],
    reverified: row.reverified as Record<string, string>,
  };
}

async function listAll(db: SqlClient): Promise<CommunityConfig[]> {
  const [created, overrides] = await Promise.all([
    db.query<{ config: unknown }>("select config from public.communities order by seq"),
    db.query<Row>("select * from public.community_info_overrides"),
  ]);
  const byId = new Map(overrides.rows.map((r) => [String(r.community_id), toOverrides(r)]));
  return [...COMMUNITIES, ...created.rows.map((r) => CommunityConfigSchema.parse(r.config))].map((c) =>
    applyInfoOverrides(c, byId.get(c.id)),
  );
}

async function getOne(db: SqlClient, id: string): Promise<CommunityConfig | undefined> {
  const builtIn = COMMUNITIES.find((c) => c.id === id);
  if (builtIn) {
    const { rows } = await db.query<Row>("select * from public.community_info_overrides where community_id = $1", [id]);
    return applyInfoOverrides(builtIn, toOverrides(rows[0]));
  }
  const { rows } = await db.query<Row>(
    `select c.config, o.* from public.communities c
     left join public.community_info_overrides o on o.community_id = c.id
     where c.id = $1`,
    [id],
  );
  if (rows.length === 0) return undefined;
  const overrides = rows[0].community_id ? toOverrides(rows[0]) : undefined;
  return applyInfoOverrides(CommunityConfigSchema.parse(rows[0].config), overrides);
}

async function insertCommunity(db: SqlClient, community: CommunityConfig) {
  await db.query(
    "insert into public.communities (id, name_key, case_prefix, status, config) values ($1, $2, $3, $4, $5::jsonb)",
    [community.id, communityNameKey(community.displayName), casePrefix(community.id), community.status, json(community)],
  );
}

/**
 * Applies `change` to a community's overrides inside one transaction, with the row locked, and
 * records the log entry — so two moderators editing at once can't lose each other's change.
 */
async function changeInfo(
  db: SqlClient,
  communityId: string,
  change: (community: CommunityConfig, o: InfoOverrides) => { log: Omit<CommunityInfoLogEntry, "id" | "communityId" | "occurredAt"> } | InfoChangeResult,
  now: Date,
): Promise<InfoChangeResult> {
  return db.transaction(async (tx) => {
    const community = await getOne(tx, communityId);
    if (!community) return { ok: false, error: "unknown_community" };
    await tx.query("insert into public.community_info_overrides (community_id) values ($1) on conflict do nothing", [
      communityId,
    ]);
    const { rows } = await tx.query<Row>(
      "select * from public.community_info_overrides where community_id = $1 for update",
      [communityId],
    );
    const o = toOverrides(rows[0]) ?? emptyOverrides();
    const outcome = change(community, o);
    if ("ok" in outcome) return outcome;
    await tx.query(
      `update public.community_info_overrides
       set sources = $2::jsonb, contacts = $3::jsonb, removed_ids = $4::jsonb, reverified = $5::jsonb
       where community_id = $1`,
      [communityId, json(o.sources), json(o.contacts), json(o.removedIds), json(o.reverified)],
    );
    await tx.query(
      "insert into public.community_info_log (community_id, action, detail, actor_id, occurred_at) values ($1, $2, $3, $4, $5::timestamptz)",
      [communityId, outcome.log.action, outcome.log.detail, outcome.log.actorId, now.toISOString()],
    );
    return { ok: true };
  });
}

export function createSqlCommunityRepository(db: SqlClient): CommunityRepository {
  return {
    listCommunities: () => listAll(db),
    getCommunity: (id) => getOne(db, id),

    async createCommunity(rawInput) {
      // Built from the current list; if another server created a clashing community in the
      // meantime, the unique constraints refuse it and we rebuild against the fresh list.
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = buildCreatedCommunity(rawInput, await listAll(db));
        if (!result.ok) return result;
        try {
          await insertCommunity(db, result.community);
          return result;
        } catch (error) {
          if (isUniqueViolation(error, "communities_name_key_key")) return { ok: false, error: "duplicate_name" };
          if (!isUniqueViolation(error)) throw error;
        }
      }
      throw new Error("Couldn't find a free id for the new community");
    },

    async startCommunityForPlace(rawParts) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const { rows } = await db.query<{ n: number }>(
          "select count(*)::int as n from public.communities where status = 'starter'",
        );
        const result = buildStarterCommunity(rawParts, await listAll(db), rows[0].n);
        if (!result.ok || !result.created) return result;
        try {
          await insertCommunity(db, result.community);
          return result;
        } catch (error) {
          // Someone started the same place a moment ago (name) or took the id: rebuild, which
          // then finds and reuses theirs.
          if (!isUniqueViolation(error)) throw error;
        }
      }
      throw new Error("Couldn't start a community for this place");
    },

    async adoptStarterCommunity(id) {
      const { rows } = await db.query(
        `update public.communities set status = 'pilot', config = jsonb_set(config, '{status}', '"pilot"')
         where id = $1 and status = 'starter' returning id`,
        [id],
      );
      return rows.length > 0;
    },

    async deleteCommunity(id, actorId, now = new Date()) {
      if (isBuiltInCommunity(id)) return { ok: false, error: "built_in" };
      return db.transaction(async (tx) => {
        // Locking the row means two moderators can't both delete it, and a concurrent edit waits.
        const { rows } = await tx.query<{ name: string }>(
          "select config->>'displayName' as name from public.communities where id = $1 for update",
          [id],
        );
        if (rows.length === 0) return { ok: false, error: "not_found" } as const;
        const cases = await tx.query<{ n: number }>(
          "select count(*)::int as n from public.cases where community_id = $1 and deleted_at is null",
          [id],
        );
        if (cases.rows[0].n > 0) return { ok: false, error: "has_cases" } as const;
        await tx.query("delete from public.communities where id = $1", [id]);
        await tx.query("delete from public.community_info_overrides where community_id = $1", [id]);
        await tx.query(
          "insert into public.community_info_log (community_id, action, detail, actor_id, occurred_at) values ($1, 'delete_community', $2, $3, $4::timestamptz)",
          [id, rows[0].name, actorId, now.toISOString()],
        );
        return { ok: true } as const;
      });
    },

    addTrustedSource: (communityId, rawInput, actorId, now = new Date()) =>
      changeInfo(
        db,
        communityId,
        (_community, o) => {
          const parsed = NewSourceInputSchema.safeParse(rawInput);
          if (!parsed.success) return { ok: false, error: "invalid" };
          const source = SourceConfigSchema.parse({ id: entryId(parsed.data.name), ...parsed.data });
          o.sources.push(source);
          return { log: { action: "add_source", detail: source.name, actorId } };
        },
        now,
      ),

    addOfficialContact: (communityId, rawInput, actorId, now = new Date()) =>
      changeInfo(
        db,
        communityId,
        (_community, o) => {
          const parsed = NewContactInputSchema.safeParse(rawInput);
          if (!parsed.success) return { ok: false, error: "invalid" };
          const contact = ContactConfigSchema.parse({ id: entryId(parsed.data.name), ...parsed.data });
          o.contacts.push(contact);
          return { log: { action: "add_contact", detail: contact.name, actorId } };
        },
        now,
      ),

    removeCommunityInfoEntry: (communityId, kind, id, actorId, now = new Date()) =>
      changeInfo(
        db,
        communityId,
        (community, o) => {
          const entry = findInfoEntry(community, kind, id);
          if (!entry) return { ok: false, error: "not_found" };
          if (kind === "source") o.sources = o.sources.filter((s) => s.id !== id);
          else o.contacts = o.contacts.filter((c) => c.id !== id);
          o.removedIds.push(id);
          return { log: { action: kind === "source" ? "remove_source" : "remove_contact", detail: entry.name, actorId } };
        },
        now,
      ),

    reverifyCommunityInfoEntry: (communityId, kind, id, actorId, now = new Date()) =>
      changeInfo(
        db,
        communityId,
        (community, o) => {
          const entry = findInfoEntry(community, kind, id);
          if (!entry) return { ok: false, error: "not_found" };
          if (kind === "contact" && !("sourceUrl" in entry && entry.sourceUrl)) return { ok: false, error: "invalid" };
          o.reverified[id] = now.toISOString().slice(0, 10);
          return { log: { action: kind === "source" ? "reverify_source" : "reverify_contact", detail: entry.name, actorId } };
        },
        now,
      ),

    async listCommunityInfoLog() {
      const { rows } = await db.query<Row>("select * from public.community_info_log order by seq desc");
      return rows.map((r) => ({
        id: String(r.id),
        communityId: String(r.community_id),
        action: r.action as CommunityInfoLogEntry["action"],
        detail: String(r.detail),
        actorId: String(r.actor_id),
        occurredAt: iso(r.occurred_at),
      }));
    },

    async recordCommunityRequest(rawInput, now = new Date()) {
      const request = buildCommunityRequest(rawInput, now);
      if (!request) return false;
      await db.transaction(async (tx) => {
        await tx.query(
          `insert into public.community_requests (id, place_name, parts, place_key, note, language, created_at)
           values ($1, $2, $3::jsonb, $4, $5, $6, $7::timestamptz)`,
          [
            request.id,
            request.placeName,
            request.parts ? json(request.parts) : null,
            request.placeKey,
            request.note ?? null,
            request.language,
            request.createdAt,
          ],
        );
        // Keep only the newest MAX_STORED_REQUESTS.
        await tx.query(
          `delete from public.community_requests where id in (
             select id from public.community_requests order by seq desc offset $1)`,
          [MAX_STORED_REQUESTS],
        );
      });
      return true;
    },

    async listCommunityRequestSummaries() {
      const { rows } = await db.query<Row>("select * from public.community_requests order by seq");
      const requests: CommunityRequest[] = rows.map((r) => ({
        id: String(r.id),
        placeName: String(r.place_name),
        ...(r.parts ? { parts: r.parts as CommunityRequest["parts"] } : {}),
        placeKey: String(r.place_key),
        ...(r.note ? { note: String(r.note) } : {}),
        language: r.language as CommunityRequest["language"],
        createdAt: iso(r.created_at),
      }));
      return summarizeCommunityRequests(requests);
    },
  };
}
