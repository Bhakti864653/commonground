/**
 * Whether this server stores data in Postgres (DATABASE_URL set) or only in memory. Used by the
 * admin pages to tell moderators truthfully whether what they change will last.
 */
export function usesDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
