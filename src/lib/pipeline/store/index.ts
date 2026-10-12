import { getSqlClient } from "@/lib/db/pool";
import type { PipelineRepository } from "./pipeline-repository";
import { memoryPipelineRepository, __resetMemoryPipelineStore } from "./memory-pipeline-store";
import { createSqlPipelineRepository } from "./sql-pipeline-store";

export type { PipelineRepository } from "./pipeline-repository";

let sqlRepository: PipelineRepository | null = null;

/** Same rule as cases: Postgres when DATABASE_URL is set (never in tests), otherwise memory. */
export function getPipelineRepository(): PipelineRepository {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.VITEST) return memoryPipelineRepository;
  sqlRepository ??= createSqlPipelineRepository(getSqlClient(url));
  return sqlRepository;
}

/** Test-only. */
export function __resetPipelineStoreForTests(): void {
  __resetMemoryPipelineStore();
}
