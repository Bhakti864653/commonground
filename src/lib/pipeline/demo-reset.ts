import { getSqlClient } from "@/lib/db/pool";
import { getCaseByCaseNumber, removeExampleCasesInMemory, resetDemoCasesInMemory } from "@/lib/store/memory-case-store";
import { demoCreatedCaseNumbersInMemory, removeCasesFromPipelineInMemory, resetDemoPipelineInMemory } from "./store/memory-pipeline-store";
import { removeCasesFromOfficeInMemory, resetDemoOfficeInMemory } from "@/lib/office/store/memory-office-store";
import { DEMO_CASE_CREATED_ACTION } from "./demo-cases";
import { resetDemoCasesSql } from "./store/sql-demo-reset";
import { getPipelineRepository } from "./store";
import { DEMO_COMMUNITY_ID } from "@/lib/store/demo-seed";
import type { Case } from "@/lib/schema/report";

/**
 * "Reset demo": puts ONLY the eight example (demonstration) cases back to their starting state —
 * timeline, status, suggestions, pipeline stage, outbox and audit log — and deletes the example
 * cases created in demo mode (demo-cases.ts). Resident cases are never selected (see
 * resetDemoCasesSql / resetDemoCasesInMemory). Records the reset itself in the audit log, under the
 * moderator who pressed the button.
 */
export async function resetDemo(moderator: string, now: Date = new Date()): Promise<{ reset: string[]; removed: string[] }> {
  const url = process.env.DATABASE_URL;
  let reset: string[];
  let removed: string[];
  if (url && !process.env.VITEST) {
    ({ reset, removed } = await resetDemoCasesSql(getSqlClient(url), now));
  } else {
    removed = removeExampleCasesInMemory(demoCreatedCaseNumbersInMemory(DEMO_CASE_CREATED_ACTION)).sort();
    removeCasesFromPipelineInMemory(new Set(removed));
    removeCasesFromOfficeInMemory(new Set(removed));
    reset = resetDemoCasesInMemory(now);
    resetDemoPipelineInMemory(reset.map((n) => getCaseByCaseNumber(n)).filter((c): c is Case => !!c));
    resetDemoOfficeInMemory(new Set(reset));
  }
  await getPipelineRepository().addAudit({
    communityId: DEMO_COMMUNITY_ID,
    actorType: "moderator",
    actor: moderator,
    action: "demo_reset",
    summary:
      `Reset the example cases (and the simulated office side) to their demo starting state: ${reset.join(", ") || "none found"}.` +
      (removed.length ? ` Deleted the demo cases created during the demo: ${removed.join(", ")}.` : "") +
      " No resident case was touched.",
  });
  return { reset, removed };
}
