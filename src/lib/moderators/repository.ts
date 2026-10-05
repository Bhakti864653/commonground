import type { AddModeratorResult, Moderator, RemoveModeratorResult } from "./logic";

/**
 * Moderator accounts and their sign-in sessions, wherever they're stored: in memory (tests, and
 * when no database is configured) or Postgres (db/migrations/0005_moderators.sql).
 * moderator-repository-contract.test.ts runs the same tests against both.
 */
export interface ModeratorRepository {
  /** Owner first, then by when they were added. */
  listModerators(): Promise<Moderator[]>;
  getModerator(email: string): Promise<Moderator | undefined>;
  addModerator(rawInput: unknown, addedBy: string, now?: Date): Promise<AddModeratorResult>;
  /** The owner can't be removed. Removing someone ends their sessions at once. */
  removeModerator(email: string): Promise<RemoveModeratorResult>;
  /** Makes sure the owner (from OWNER_EMAIL) has a row, with the owner role. */
  ensureOwner(email: string, name: string, now?: Date): Promise<Moderator>;

  createSession(email: string, tokenHash: string, expiresAt: Date, now?: Date): Promise<void>;
  /** The moderator a session belongs to, if the session exists, hasn't expired, and they're still a moderator. */
  getSessionModerator(tokenHash: string, now?: Date): Promise<Moderator | undefined>;
  deleteSession(tokenHash: string): Promise<void>;
}
