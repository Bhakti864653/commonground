import type { CurrentModerator } from "./auth";

/**
 * The name an admin action is recorded under: the moderator's email when they signed in with
 * Google; "admin" for the shared access code, as every action was recorded before accounts.
 */
export function actorIdOf(moderator: CurrentModerator | null | undefined | void): string {
  return moderator?.email ?? "admin";
}
