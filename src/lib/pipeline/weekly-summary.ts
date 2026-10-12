import type { Case } from "@/lib/schema/report";
import { daysBetween, weekStartOf } from "./schedule";
import type { WeeklySummaryPayload } from "./types";

const FINISHED = new Set(["closed", "not_verifiable"]);

/** This week's numbers for one community, counted by code (no AI). */
export function computeWeeklyStats(cases: Case[], now: Date): Omit<WeeklySummaryPayload, "highlight" | "source"> {
  const weekStart = weekStartOf(now);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const live = cases.filter((c) => !c.removal && !c.deletedAt);
  const open = live.filter((c) => !FINISHED.has(c.status) && !c.isDuplicateOf);
  const resolved = live.filter((c) => {
    if (c.status !== "closed") return false;
    const closedAt = c.statusHistory.filter((e) => (e.kind ?? "status") === "status" && e.status === "closed").at(-1)?.occurredAt;
    return closedAt !== undefined && closedAt >= weekAgo;
  });
  const byArea = new Map<string, number>();
  for (const c of open) {
    const id = c.approximateArea.areaId;
    if (id) byArea.set(id, (byArea.get(id) ?? 0) + 1);
  }
  return {
    weekStart,
    newCases: live.filter((c) => c.createdAt >= weekAgo).length,
    resolvedCases: resolved.length,
    openCases: open.length,
    oldestOpen: [...open]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, 3)
      .map((c) => ({ caseNumber: c.publicCaseNumber, daysOpen: Math.max(0, daysBetween(c.createdAt, now)) })),
    hotspots: [...byArea]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([areaId, count]) => ({ areaId, count })),
  };
}
