import type { SqlClient } from "@/lib/db/sql-client";
import { NewModeratorInputSchema, normalizeEmail, type Moderator, type ModeratorRole } from "./logic";
import type { ModeratorRepository } from "./repository";

/** The Postgres implementation of ModeratorRepository (tables: db/migrations/0005_moderators.sql). */

type Row = Record<string, unknown>;

const iso = (value: unknown) => (value instanceof Date ? value : new Date(String(value))).toISOString();

function toModerator(row: Row): Moderator {
  return {
    email: String(row.email),
    name: String(row.name),
    role: row.role as ModeratorRole,
    addedAt: iso(row.added_at),
    addedBy: String(row.added_by),
  };
}

export function createSqlModeratorRepository(db: SqlClient): ModeratorRepository {
  return {
    async listModerators() {
      const { rows } = await db.query<Row>(
        `select * from public.moderators order by (role = 'owner') desc, added_at, email`,
      );
      return rows.map(toModerator);
    },

    async getModerator(email) {
      const { rows } = await db.query<Row>(`select * from public.moderators where email = $1`, [normalizeEmail(email)]);
      return rows[0] && toModerator(rows[0]);
    },

    async addModerator(rawInput, addedBy, now = new Date()) {
      const parsed = NewModeratorInputSchema.safeParse(rawInput);
      if (!parsed.success) return { ok: false, error: "invalid" };
      const { rows } = await db.query<Row>(
        `insert into public.moderators (email, name, role, added_at, added_by)
         values ($1, $2, 'moderator', $3::timestamptz, $4)
         on conflict (email) do nothing
         returning *`,
        [parsed.data.email, parsed.data.name, now.toISOString(), addedBy],
      );
      return rows[0] ? { ok: true, moderator: toModerator(rows[0]) } : { ok: false, error: "exists" };
    },

    async removeModerator(email) {
      const key = normalizeEmail(email);
      // Sessions go with the row (on delete cascade).
      const { rows } = await db.query<Row>(
        `with target as (select role from public.moderators where email = $1),
              deleted as (delete from public.moderators where email = $1 and role <> 'owner' returning email)
         select (select role from target) as role, (select count(*) from deleted)::int as deleted`,
        [key],
      );
      const row = rows[0];
      if (!row?.role) return { ok: false, error: "not_found" };
      if (row.deleted === 0) return { ok: false, error: "owner" };
      return { ok: true };
    },

    async ensureOwner(email, name, now = new Date()) {
      const { rows } = await db.query<Row>(
        `insert into public.moderators (email, name, role, added_at, added_by)
         values ($1, $2, 'owner', $3::timestamptz, 'OWNER_EMAIL')
         on conflict (email) do update set
           role = 'owner',
           name = case when public.moderators.name = '' then excluded.name else public.moderators.name end
         returning *`,
        [normalizeEmail(email), name, now.toISOString()],
      );
      return toModerator(rows[0]);
    },

    async createSession(email, tokenHash, expiresAt, now = new Date()) {
      await db.query(
        `insert into public.moderator_sessions (token_hash, email, created_at, expires_at)
         values ($1, $2, $3::timestamptz, $4::timestamptz)`,
        [tokenHash, normalizeEmail(email), now.toISOString(), expiresAt.toISOString()],
      );
      // Housekeeping: expired sessions are useless; drop them while we're here.
      await db.query(`delete from public.moderator_sessions where expires_at <= $1::timestamptz`, [now.toISOString()]);
    },

    async getSessionModerator(tokenHash, now = new Date()) {
      const { rows } = await db.query<Row>(
        `select m.* from public.moderator_sessions s
         join public.moderators m on m.email = s.email
         where s.token_hash = $1 and s.expires_at > $2::timestamptz`,
        [tokenHash, now.toISOString()],
      );
      return rows[0] && toModerator(rows[0]);
    },

    async deleteSession(tokenHash) {
      await db.query(`delete from public.moderator_sessions where token_hash = $1`, [tokenHash]);
    },
  };
}
