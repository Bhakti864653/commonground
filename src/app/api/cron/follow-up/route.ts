import { runFollowUp } from "@/lib/pipeline/pipeline";
import { isAuthorizedCron } from "@/lib/pipeline/cron-auth";

/**
 * The Follow-up Agent's daily run (vercel.json schedules it). Vercel's cron sends
 * "Authorization: Bearer <CRON_SECRET>"; anyone else gets 401. With no CRON_SECRET configured it
 * refuses everything, so the route can never be triggered by outsiders by accident.
 * It only drafts suggestions for moderators — it never approves, publishes or sends anything.
 */
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await runFollowUp("cron");
  return Response.json(report);
}
