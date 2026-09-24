import { ACTION_TRAIL_STAGES, STATUS_TO_TRAIL_PROGRESS, type ReportStatus } from "@/lib/schema/report";

/** How many of the five public trail stages a status has actually reached (1-based count). */
export function stagesReached(status: ReportStatus): number {
  return STATUS_TO_TRAIL_PROGRESS[status].length;
}

/** The furthest stage actually reached — never an optimistic one. */
export function currentStage(status: ReportStatus): (typeof ACTION_TRAIL_STAGES)[number] {
  const reached = STATUS_TO_TRAIL_PROGRESS[status];
  return reached[reached.length - 1];
}
