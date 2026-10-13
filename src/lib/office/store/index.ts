import { getSqlClient } from "@/lib/db/pool";
import type { OfficeRepository } from "./office-repository";
import { memoryOfficeRepository } from "./memory-office-store";
import { createSqlOfficeRepository } from "./sql-office-store";

export type { OfficeRepository } from "./office-repository";

let sqlRepository: OfficeRepository | null = null;

/** Same rule as cases: Postgres when DATABASE_URL is set (never in tests), otherwise memory. */
export function getOfficeRepository(): OfficeRepository {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.VITEST) return memoryOfficeRepository;
  sqlRepository ??= createSqlOfficeRepository(getSqlClient(url));
  return sqlRepository;
}
