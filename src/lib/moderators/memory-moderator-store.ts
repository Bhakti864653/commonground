import { NewModeratorInputSchema, normalizeEmail, type Moderator } from "./logic";
import type { ModeratorRepository } from "./repository";

type State = {
  moderators: Map<string, Moderator>;
  sessions: Map<string, { email: string; expiresAt: string }>;
};

/** Same `globalThis` pattern as the case store, so a dev-server reload doesn't sign everyone out. */
function state(): State {
  const g = globalThis as typeof globalThis & { __commonGroundModerators__?: State };
  g.__commonGroundModerators__ ??= { moderators: new Map(), sessions: new Map() };
  return g.__commonGroundModerators__;
}

const copy = <T>(value: T): T => structuredClone(value);

function sorted(moderators: Iterable<Moderator>): Moderator[] {
  return [...moderators].sort(
    (a, b) => Number(b.role === "owner") - Number(a.role === "owner") || a.addedAt.localeCompare(b.addedAt) || a.email.localeCompare(b.email),
  );
}

export const memoryModeratorRepository: ModeratorRepository = {
  async listModerators() {
    return copy(sorted(state().moderators.values()));
  },

  async getModerator(email) {
    const found = state().moderators.get(normalizeEmail(email));
    return found && copy(found);
  },

  async addModerator(rawInput, addedBy, now = new Date()) {
    const parsed = NewModeratorInputSchema.safeParse(rawInput);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const { moderators } = state();
    if (moderators.has(parsed.data.email)) return { ok: false, error: "exists" };
    const moderator: Moderator = { ...parsed.data, role: "moderator", addedAt: now.toISOString(), addedBy };
    moderators.set(moderator.email, moderator);
    return { ok: true, moderator: copy(moderator) };
  },

  async removeModerator(email) {
    const key = normalizeEmail(email);
    const { moderators, sessions } = state();
    const found = moderators.get(key);
    if (!found) return { ok: false, error: "not_found" };
    if (found.role === "owner") return { ok: false, error: "owner" };
    moderators.delete(key);
    for (const [hash, session] of sessions) if (session.email === key) sessions.delete(hash);
    return { ok: true };
  },

  async ensureOwner(email, name, now = new Date()) {
    const key = normalizeEmail(email);
    const { moderators } = state();
    const existing = moderators.get(key);
    const owner: Moderator = existing
      ? { ...existing, role: "owner", name: existing.name || name }
      : { email: key, name, role: "owner", addedAt: now.toISOString(), addedBy: "OWNER_EMAIL" };
    moderators.set(key, owner);
    return copy(owner);
  },

  async createSession(email, tokenHash, expiresAt) {
    state().sessions.set(tokenHash, { email: normalizeEmail(email), expiresAt: expiresAt.toISOString() });
  },

  async getSessionModerator(tokenHash, now = new Date()) {
    const { sessions, moderators } = state();
    const session = sessions.get(tokenHash);
    if (!session || Date.parse(session.expiresAt) <= now.getTime()) return undefined;
    const moderator = moderators.get(session.email);
    return moderator && copy(moderator);
  },

  async deleteSession(tokenHash) {
    state().sessions.delete(tokenHash);
  },
};

/** Test-only: back to no moderators and no sessions. */
export function __resetModeratorsForTests(): void {
  (globalThis as typeof globalThis & { __commonGroundModerators__?: State }).__commonGroundModerators__ = undefined;
}
