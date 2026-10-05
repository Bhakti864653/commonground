import { getSqlClient } from "@/lib/db/pool";
import { memoryModeratorRepository } from "./memory-moderator-store";
import { createSqlModeratorRepository } from "./sql-moderator-store";
import type { ModeratorRepository } from "./repository";

let sqlRepository: ModeratorRepository | null = null;

/**
 * Where moderator accounts live: Postgres when DATABASE_URL is set, otherwise in memory (then a
 * restart signs everyone out and forgets added moderators — fine for local development only).
 * Tests always get the in-memory store.
 */
export function getModeratorRepository(): ModeratorRepository {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.VITEST) return memoryModeratorRepository;
  sqlRepository ??= createSqlModeratorRepository(getSqlClient(url));
  return sqlRepository;
}
